class RestDB {
  constructor(apiKey, baseUrl) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async query(collection, method = 'GET', data = null, id = '') {
    const url = `${this.baseUrl}/${collection}/${id}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-apikey': this.apiKey
      }
    };
    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error making API request:', error);
    }
  }

  async get(collection) {
    return this.query(collection);
  }

  async post(collection, data) {
    return this.query(collection, 'POST', data);
  }

  async put(collection, data, id) {
    return this.query(collection, 'PUT', data, id);
  }

  async delete(collection, id) {
    return this.query(collection, 'DELETE', null, id);
  }

  async initializeProjects() {
    try {
      const projects = await this.get('projects');
      const existingProjectNames = new Set(projects.map(p => p.name));

      for (const project of defaultProjects) {
        if (!existingProjectNames.has(project.name)) {
          await this.post('projects', project);
        }
      }

      console.log("Projects collection initialized successfully.");
    } catch (error) {
      console.error("Error initializing projects collection:", error);
    }
  }

  async initializeBlogPosts() {
    try {
      const blogPosts = await this.get('blog-posts');
      const existingTitles = new Set(blogPosts.map(bp => bp.title));

      for (const post of defaultBlogPosts) {
        if (!existingTitles.has(post.title)) {
          post['created-at'] = new Date().toISOString();
          post['updated-at'] = post['created-at'];
          await this.post('blog-posts', post);
        }
      }

      console.log("Blog posts collection initialized successfully.");
    } catch (error) {
      console.error("Error initializing blog posts collection:", error);
    }
  }

  async initializeLinks() {
    try {
      const links = await this.get('links');
      const existingLinkTitles = new Set(links.map(l => l.title));

      for (const link of defaultLinks) {
        await this.addLinkIfNotExists(link, existingLinkTitles);
      }

      console.log("Links collection initialized successfully.");
    } catch (error) {
      console.error("Error initializing links collection:", error);
    }
  }

  async addLinkIfNotExists(link, existingLinkTitles, parentId = null) {
    if (!existingLinkTitles.has(link.title)) {
      const newLink = { ...link, 'parent-id': parentId };
      delete newLink.additional;
      const result = await this.post('links', newLink);
      if (link.additional) {
        for (const child of link.additional) {
          await this.addLinkIfNotExists(child, existingLinkTitles, result._id);
        }
      }
    }
  }
}

// Create a global instance of RestDB for use in all scripts
const restDB = new RestDB(config.apiKey, config.baseUrl);
