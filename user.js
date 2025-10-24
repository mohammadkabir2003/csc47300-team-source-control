// profile div
const profileDiv = document.getElementById("profileDiv");
// logout button

// read loggedInUser only from sessionStorage so the profile is not auto-shown
const user = JSON.parse(sessionStorage.getItem("loggedInUser"));

if (!user) {
  // profile div not be displayed
  profileDiv.innerHTML = "<p> No user logged in. </p>";
} else {
  // get user information from user object

  const email = user.email;
  const s = user.student_profile;
  const p = user.seller_profile;
  console.log(email, s, p);
  // edit profile div here
  profileDiv.innerHTML = `
   <h2> Email: ${email} </h2>
   <h2> Name: ${s.first_name} ${s.last_name} </h2>
   <h2> Major: ${s.major} </h2>
  `;
}

// logoutBtn

// logout event listener on the button
// everytime you click button you remove loggedUser from localStorage
// redirect
// localStorage.removeItem("loggedInUser");
