const app = require("./app");
const { PORT } = require("./config/db");

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
