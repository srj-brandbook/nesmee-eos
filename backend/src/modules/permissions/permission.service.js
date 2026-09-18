const Permission = require("../../models/Permission");

async function list() {
  const items = await Permission.find().sort({ module: 1, action: 1 }).lean();
  return {
    items: items.map((item) => ({
      id: String(item._id),
      name: item.name,
      module: item.module,
      action: item.action,
      description: item.description,
    })),
  };
}

module.exports = { list };
