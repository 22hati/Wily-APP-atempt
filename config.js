import firebase from 'firebase'
require("@firebase/firestore");

var firebaseConfig = {
  apiKey: "AIzaSyCa2_oDJvCfejv89pAW2Salej0yffeHq9w",
  authDomain: "wily-app-31ca8.firebaseapp.com",
  projectId: "wily-app-31ca8",
  storageBucket: "wily-app-31ca8.appspot.com",
  messagingSenderId: "721147105649",
  appId: "1:721147105649:web:622cb9e09ed8d5c7fc66d0",
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export default firebase.firestore()