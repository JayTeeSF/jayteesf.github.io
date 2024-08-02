// Import SQL and environment variables
document.addEventListener("DOMContentLoaded", () => {
  const sql = new SQL();
  
  // Function to check admin login using database
  async function checkAdminLogin() {
    const username = prompt("Enter Admin Username:");
    const password = prompt("Enter Admin Password:");

    try {
      const result = await sql.select(`SELECT * FROM users WHERE username='${username}' AND password='${password}' AND role='admin'`);
      if (result.length > 0) {
        document.getElementById("admin-functions").style.display = "block";
        alert("Login successful!");
      } else {
        alert("Incorrect username or password!");
      }
    } catch (error) {
      console.error("Error checking login:", error);
    }
  }

  // Sample admin login simulation
  document.getElementById("login-btn").addEventListener("click", checkAdminLogin);

  // Function to add a new project
  document.getElementById("project-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = document.getElementById("project-name").value;
    const url = document.getElementById("project-url").value;

    try {
      const result = await sql.insert("projects", { name: name, url: url });
      console.log("Project added:", result);
      alert("Project added successfully!");
    } catch (error) {
      console.error("Error adding project:", error);
    }
  });
});
