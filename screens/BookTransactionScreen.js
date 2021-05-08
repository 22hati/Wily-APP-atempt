import React from "react";
import firebase from "firebase";
import db from "../config";
import * as Permissions from "expo-permissions";
import { BarCodeScanner } from "expo-barcode-scanner";
import { StatusBar } from "expo-status-bar";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Image,
  KeyboardAvoidingView,
  ToastAndroid,
} from "react-native";

export default class TransactionScreen extends React.Component {
  constructor() {
    super();
    this.state = {
      hasCameraPermissions: null,
      scanned: false,
      scannedData: "",
      buttonState: "normal",
      transactionMessage: "",
      scannedStudentId: "",
      scannedBookId: "",
    };
  }

  getCameraPermissions = async () => {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({
      hasCameraPermissions: status === "granted",
      buttonState: "clicked",
      scanned: false,
    });
  };

  handleBarCodeScanner = async ({ type, data }) => {
    this.setState({
      scanned: true,
      scannedData: data,
      buttonState: "normal",
    });
  };

  checkBookEligibility = async () => {
    const bookRef = await db
      .collection("books")
      .where("bookId", "==", this.state.scannedBookId)
      .get();

    var transactionType = "";
    if (bookRef.docs.length == 0) {
      transactionType = false;
    } else {
      bookRef.docs.map((doc) => {
        var book = doc.data();

        if (book.bookAvailability) {
          transactionType = "Issue";
        } else {
          transactionType = "Return";
        }
      });
    }

    return transactionType;
  };

  checkStudentEligibilityForBookIssue = async () => {
    const studentRef = await db
      .collection("students")
      .where("studentId", "==", this.state.scannedStudentId)
      .get();

    var isStudentEligilble = "";
    if (studentRef.docs.length == 0) {
      isStudentEligilble = false;
      alert("student Id not identified in the database");
      this.setState({
        scannedStudentId: "",
        scannedBookId: "",
      });
    } else {
      studentRef.docs.map((doc) => {
        var student = doc.data();

        if (student.numberOfBooksIssued < 2) {
          isStudentEligilble = true;
        } else {
          isStudentEligilble = false;
          alert("This student has already Issued 2 books");
          this.setState({
            scannedStudentId: "",
            scannedBookId: "",
          });
        }
      });
    }

    return isStudentEligilble;
  };

  checkStudentEligibilityForBookReturn = async () => {
    const transactionRef = await db
      .collection("transactions")
      .where("bookId", "==", this.state.scannedBookId)
      .limit(1)
      .get();

    var isStudentEligilble = "";

    transactionRef.docs.map((doc) => {
      var lastBookTransaction = doc.data();
      if(lastBookTransaction.studentId === this.state.scannedStudentId) {
        isStudentEligilble = true;
      } else {
        isStudentEligilble = false;
        alert("book has not been issued by the student yet")
        this.setState({
          scannedStudentId: "",
          scannedBookId: "",
        });
      }
    });

    return isStudentEligilble;
  };

  handleTransaction = async () => {
    var transactionMessage = null;

    db.collection("books")
      .doc(this.state.scannedBookId)
      .get()
      .then((doc) => {
        var book = doc.data();
        if (book.bookAvailability) {
          this.initiateBookIssue();
          transactionMessage =
            "Book Issued. Congrads you have chosen a great book!";
          //alert("Congrads you have chosen a great book!");
          ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
        } else {
          this.initiateBookReturn();
          transactionMessage =
            "Book Returned. Thank you for returning the book on scheduled time!";
          //alert("Thank you for returning the book on scheduled time!")
          ToastAndroid.show(transactionMessage, ToastAndroid.SHORT);
        }
      });

    this.setState({
      transactionMessage: transactionMessage,
    });
  };

  initiateBookIssue = async () => {
    //add a transaction
    db.collection("transaction").add({
      studentId: this.state.scannedStudentId,
      bookId: this.state.scannedBookId,
      data: firebase.firestore.Timestamp.now().toDate(),
      transactionType: "Issue",
    });
    //change book status
    db.collection("books").doc(this.state.scannedBookId).update({
      bookAvailability: false,
    });
    //change number of issued books for student
    db.collection("students")
      .doc(this.state.scannedStudentId)
      .update({
        numberOfBooksIssued: firebase.firestore.FieldValue.increment(1),
      });
    this.setState({
      scannedStudentId: "",
      scannedBookId: "",
    });
  };

  initiateBookReturn = async () => {
    //add a transaction
    db.collection("transactions").add({
      studentId: this.state.scannedStudentId,
      bookId: this.state.scannedBookId,
      date: firebase.firestore.Timestamp.now().toDate(),
      transactionType: "Return",
    });
    //change book status
    db.collection("books").doc(this.state.scannedBookId).update({
      bookAvailability: true,
    });
    //change book status
    db.collection("students")
      .doc(this.state.scannedStudentId)
      .update({
        numberOfBooksIssued: firebase.firestore.FieldValue.increment(-1),
      });
    this.setState({
      scannedStudentId: "",
      scannedBookId: "",
    });
  };

  render() {
    const hasCameraPermissions = this.state.hasCameraPermissions;
    const scanned = this.state.scanned;
    const buttonState = this.state.buttonState;
    if (buttonState === "clicked" && hasCameraPermissions) {
      return (
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : this.handleBarCodeScanner}
          style={StyleSheet.absoluteFillObject}
        />
      );
    } else if (buttonState === "normal") {
      return (
        <KeyboardAvoidingView
          style={styles.container}
          behavior="padding"
          enabled
        >
          <View>
            <Image
              source={require("../assets/booklogo.jpg")}
              style={{ width: 200, height: 200 }}
            />
            <Text style={{ textAlign: "center", fontSize: 30 }}>Wily</Text>
          </View>
          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder="Book Id"
              value={this.state.scannedBookId}
              onChangeText={(text) =>
                this.setState({
                  scannedBookId: text,
                })
              }
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                this.getCameraPermissions("BookId");
              }}
            >
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputView}>
            <TextInput
              style={styles.inputBox}
              placeholder="Student Id"
              value={this.state.scannedStudentId}
              onChangeText={(text) =>
                this.setState({
                  scannedStudentId: text,
                })
              }
            />
            <TouchableOpacity
              style={styles.scanButton}
              onPress={() => {
                this.getCameraPermissions("StudentId");
              }}
            >
              <Text style={styles.buttonText}>Scan</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={async () => {
              var transactionMessage = this.handleTransaction();
              this.setState({
                scannedBookId: "",
                scannedStudentId: "",
              });
            }}
          >
            <Text style={styles.submitButtonText}>Submit</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  displayText: {
    fontSize: 15,
    textDecorationLine: "underline",
  },
  scanButton: {
    backgroundColor: "#2196F3",
    padding: 10,
    margin: 10,
  },
  buttonText: {
    fontSize: 20,
  },
  inputView: {
    flexDirection: "row",
    margin: 20,
  },
  inputBox: {
    width: 200,
    height: 40,
    borderWidth: 1.5,
    borderRightWidth: 0,
    fontSize: 20,
  },
  scanButton: {
    backgroundColor: "#66BB6A",
    width: 50,
    borderWidth: 1.5,
    borderLeftWidth: 0,
  },
  submitButton: {
    backgroundColor: "skyblue",
    width: 100,
    height: 50,
  },
  submitButtonText: {
    padding: 10,
    textAlign: "center",
    fontSize: 20,
    fontweight: "bold",
    color: "white",
  },
});
