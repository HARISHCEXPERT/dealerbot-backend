const scoreLead = (messages = []) => {
  const t = messages.join(" ").toLowerCase();
  if (t.includes("buy") || t.includes("price")) return "hot";
  if (t.includes("model") || t.includes("details")) return "warm";
  return "cold";
};

module.exports = { scoreLead };
