class SQL {
  constructor() {
    this.host = env.dbHost;
    this.port = env.dbPort;
    this.user = env.dbUser;
    this.password = env.dbPassword;
    this.database = env.dbName;
  }

  async query(sql) {
    const connectionString = `mysql://${this.user}:${this.password}@${this.host}:${this.port}/${this.database}`;
    try {
      const response = await fetch(connectionString, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: sql }),
      });
      return response.json();
    } catch (error) {
      console.error("Error executing query:", error);
    }
  }

  async select(sql) {
    return this.query(sql);
  }

  async insert(table, data) {
    const keys = Object.keys(data).join(", ");
    const values = Object.values(data)
      .map((value) => `'${value}'`)
      .join(", ");
    const query = `INSERT INTO ${table} (${keys}) VALUES (${values})`;
    return this.query(query);
  }

  async update(table, data, condition) {
    const updates = Object.entries(data)
      .map(([key, value]) => `${key}='${value}'`)
      .join(", ");
    const query = `UPDATE ${table} SET ${updates} WHERE ${condition}`;
    return this.query(query);
  }

  async delete(table, condition) {
    const query = `DELETE FROM ${table} WHERE ${condition}`;
    return this.query(query);
  }
}
