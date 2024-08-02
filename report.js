// Simulated report access after login
document.addEventListener("DOMContentLoaded", async () => {
  const sql = new SQL();
  
  const username = prompt("Enter Report Username:");
  const password = prompt("Enter Report Password:");

  try {
    const result = await sql.select(`SELECT * FROM users WHERE username='${username}' AND password='${password}' AND role='report'`);
    if (result.length > 0) {
      document.getElementById("report-content").style.display = "block";
      loadReports();
    } else {
      alert("Incorrect username or password!");
    }
  } catch (error) {
    console.error("Error checking login:", error);
  }

  async function loadReports() {
    try {
      const reports = await sql.select("SELECT * FROM reports");
      const reportList = document.getElementById("report-list");
      reports.forEach((report) => {
        const listItem = document.createElement("li");
        listItem.textContent = `Report: ${report.title}, Date: ${report.date}`;
        reportList.appendChild(listItem);
      });
    } catch (error) {
      console.error("Error loading reports:", error);
    }
  }
});
