document.addEventListener("DOMContentLoaded", async () => {
  loadLinks();
});

async function loadLinks() {
  try {
    const links = await restDB.get('links');
    const linksList = document.getElementById("links-list");
    linksList.innerHTML = ''; // Clear any default links listed in HTML

    links.forEach((link) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<a href="${link.url}">${link.title}</a>`;
      linksList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error loading links:", error);
  }
}
