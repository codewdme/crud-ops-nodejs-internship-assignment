const express = require("express");
const mysql = require("mysql2/promise");

const app = express();
const port = process.env.port || 3000;

// Middleware to parse JSON requests
app.use(express.json());

// MySQL Database Configuration
const dbConfig = {
  host: "MILITECH-X1",
  user: "root",
  password: "abc@1234",
  database: "employees",
};
// note these credentials are for my local server. please change the values accordinlgy.

// create a mysql pool
const pool = mysql.createPool(dbConfig);

/* crud operations:
create employee with multiple contact details ( realtionship mapping):
*/

app.post("/employees", async (req, res) => {
  try {
    const { name, email, phone, jobTitle, address, city, state, contacts } =
      req.body;

    //start a transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // insert employee:
      const [employeeResult] = await connection.execute(
        "INSERT INTO employees ( name, email, phone, job_title, address, city, state ) VALUES ( ?, ?, ?, ?, ?, ?, ?)",
        [name, email, phone, jobTitle, address, city, state]
      );
      const employeeId = employeeResult.insertId;

      // insert contact Details
      const contactPromises = contacts.map(async (contact) => {
        await connection.execute(
          "INSERT INTO contacts (employee_id, type,relationship, value) VALUES (?, ?, ?,?)",
          [employeeId, contact.type, contact.relationship, contact.value]
        );
      });
      await Promise.all(contactPromises);

      // Commit the transaction
      await connection.commit();
      res.status(201).json({ message: "Employee created successfully." });
    } catch (error) {
      // Rollback the transaction in case of an error
      await connection.rollback();
      throw error;
    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// list employees with pagination
app.get("/employees", async (req, res) => {
  try {
    const page = req.query.page || 1;
    const pageSize = req.query.pageSize || 10;

    const offset = parseInt((page - 1) * pageSize);

    console.log(offset);
    console.log(parseInt(pageSize));

    const [employees] = await pool.execute(
      `SELECT * FROM employees LIMIT ${offset} ,${parseInt(pageSize)}`
    );

    res.json({ employees });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// update employees details
app.put("/employees/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { name, email, phone, jobTitle, address, city, state } = req.body;

    await pool.execute(
      "UPDATE employees SET name = ?, email = ?, phone= ? , job_title= ?, address = ? , city= ? , state = ? WHERE id = ?",
      [name, email, phone, jobTitle, address, city, state, employeeId]
    );
    res.json({ message: "Employee updated successfully." });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// delete employee
app.delete("/employees/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;
    await pool.execute("DELETE FROM employees WHERE id = ?", [employeeId]);

    res.status(200).json({ message: "employee delted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// get employee
app.get("/employees/:id", async (req, res) => {
  try {
    const employeeId = req.params.id;

    const [employee] = await pool.execute(
      "SELECT * FROM employees WHERE id = ? ",
      [employeeId]
    );

    if (employee.length === 0) {
      res.status(404).json({ message: "Employee not found." });
    } else {
      res.json({ employee: employee[0] });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// server start
app.listen(port, () => {
  console.log(`server is running on port ${port}`);
});
