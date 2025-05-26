const Logger = require("../../Logging/Logger");


async function findIpAddress(req) {
  try {
    let ip = req.headers["x-forwarded-for"]
      ? req.headers["x-forwarded-for"].split(",")[0].trim()
      : req.socket.remoteAddress || req.ip; 


    if (ip && ip.startsWith("::ffff:")) {
      ip = ip.replace("::ffff:", "");
    }

    return ip;
  } catch (error) {
    Logger.error("Error finding IP address:", error);
    return undefined;
  }
}


function addMillisToCurrentDate(millis) {
  return new Date(Date.now() + millis);
}

module.exports = { findIpAddress, addMillisToCurrentDate };
