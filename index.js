document.addEventListener("DOMContentLoaded", () => {
  const toggleDarkMode = () => {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.toggle("dark-mode");
    }
  };
  document.getElementById("toggle-dark-mode").addEventListener("click", toggleDarkMode);
});

// Load projects using the SQL class from sql.js
async function loadProjects() {
  const sql = new SQL();
  try {
    const projects = await sql.select("SELECT * FROM projects");
    const projectList = document.getElementById("project-list");
    projects.forEach((project) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<a href="${project.url}">${project.name}</a>`;
      projectList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error loading projects:", error);
  }
}

loadProjects();
