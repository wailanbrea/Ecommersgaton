function isValidAdminPassword(value) {
  return typeof value === "string" && value.length >= 12 && value.length <= 128;
}

module.exports = { isValidAdminPassword };
