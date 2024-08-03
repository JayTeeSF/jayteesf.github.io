document.addEventListener("DOMContentLoaded", async () => {
  const toggleDarkMode = () => {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.body.classList.toggle("dark-mode");
    }
  };
  document.getElementById("toggle-dark-mode").addEventListener("click", toggleDarkMode);

  // Initialize the projects collection
  await restDB.initializeProjects();

  // Load data from collections
  loadProjects();
  loadBlogPosts();
});

// Function to load projects
async function loadProjects() {
  try {
    const projects = await restDB.get('projects');
    const projectList = document.getElementById("project-list");
    projectList.innerHTML = ''; // Clear any default projects listed in HTML

    projects.forEach((project) => {
      const listItem = document.createElement("li");
      listItem.innerHTML = `<a href="${project.url}">${project.name}</a>`;
      projectList.appendChild(listItem);
    });
  } catch (error) {
    console.error("Error loading projects:", error);
  }
}

// Function to load blog posts
async function loadBlogPosts() {
  try {
    const blogPosts = await restDB.get('blog-posts');
    const carousel = document.getElementById("carousel");
    const blogContainer = document.getElementById("blog-posts");
    const now = new Date();

    blogPosts.forEach((post, index) => {
      const publishedAt = new Date(post['published-at']);
      if (publishedAt <= now) { // Only show posts that are published
        if (index < 3) { // Show up to 3 featured posts in the carousel
          const carouselItem = document.createElement("div");
          carouselItem.className = "carousel-item";
          carouselItem.innerHTML = `
            <img src="${post['image-url']}" alt="${post.title}" />
            <h3>${post.title}</h3>
            <p>${marked(post.excerpt)}</p> <!-- Render markdown excerpt -->
          `;
          carousel.appendChild(carouselItem);
        }

        const postItem = document.createElement("div");
        postItem.className = "blog-post";
        postItem.innerHTML = `
          <h3>${post.title}</h3>
          <img src="${post['image-url']}" alt="${post.title}" />
          <div>${marked(post.content)}</div> <!-- Render markdown content -->
        `;
        blogContainer.appendChild(postItem);
      }
    });
  } catch (error) {
    console.error("Error loading blog posts:", error);
  }
}
