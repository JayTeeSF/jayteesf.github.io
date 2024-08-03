document.addEventListener("DOMContentLoaded", async () => {
  await restDB.initializeLinks(); // Ensure links are initialized
  loadLinks();
});

async function loadLinks() {
  try {
    const links = await restDB.get('links');
    const linksList = document.getElementById("links-list");
    linksList.innerHTML = ''; // Clear any default links listed in HTML

    // Build the hierarchy of links
    const rootLinks = links.filter(link => !link.parentId);
    for (const root of rootLinks) {
      const listItem = createLinkElement(root);
      linksList.appendChild(listItem);
      buildChildLinks(links, listItem, root._id);
    }
  } catch (error) {
    console.error("Error loading links:", error);
  }
}

function createLinkElement(link) {
  const listItem = document.createElement("li");
  listItem.innerHTML = `<a href="${link.url}">${link.title}</a>`;
  return listItem;
}

function buildChildLinks(allLinks, parentElement, parentId) {
  const childLinks = allLinks.filter(link => link.parentId === parentId);
  if (childLinks.length > 0) {
    const ul = document.createElement("ul");
    parentElement.appendChild(ul);
    for (const child of childLinks) {
      const childItem = createLinkElement(child);
      ul.appendChild(childItem);
      buildChildLinks(allLinks, childItem, child._id);
    }
  }
}
