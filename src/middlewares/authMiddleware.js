const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function verifyToken(token) {
    // console.log("here");
  const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID, 
  });
//   console.log("ticket = ", ticket.getPayload());
  const payload = ticket.getPayload();
  return payload; // Contains user information and token validity
}

exports.isAuthenticated = async (req, res, next) => {
  try {
    // console.log("req header",req.headers.authorization);
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN
    // console.log("token",token);
    if (!token) throw new Error("No token provided");
    const user = await verifyToken(token);
    // console.log("user = ",user);
    req.user = user; // Forward user info to next middleware
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid Token", error: error.message });
  }
};
