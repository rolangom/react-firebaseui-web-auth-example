/**
 * Created by rolangom on 3/4/17.
 */
firebase.initializeApp({
  apiKey: "AIzaSyDLA2o8IeySyjrlmKJiXHGoyx6uroFviWc",
  authDomain: "react-firebaseui-example.firebaseapp.com",
  databaseURL: "https://react-firebaseui-example.firebaseio.com",
  storageBucket: "react-firebaseui-example.appspot.com"
});

const uiConfig = {
  callbacks: {
    // Called when the user has been successfully signed in.
    signInSuccess: function(user, credential, redirectUrl) {
      // Do not redirect.
      return false;
    },
  },
  signInOptions: [ firebase.auth.EmailAuthProvider.PROVIDER_ID ],
  credentialHelper: firebaseui.auth.CredentialHelper.NONE,
  tosUrl: 'http://typingbless.com/'
};