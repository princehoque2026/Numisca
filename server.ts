import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Firebase Config
const configPath = path.join(__dirname, "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = admin.firestore();
const messaging = admin.messaging();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Admin Push Notification Endpoint
  app.post("/api/admin/push", async (req, res) => {
    const { title, message, link, targetUids, adminUid } = req.body;
    
    // Security Check: Verify if requester is admin
    if (!adminUid) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const adminDoc = await db.collection("users").doc(adminUid).get();
      if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
        return res.status(403).json({ error: "Forbidden" });
      }

      let tokens: string[] = [];
      
      if (targetUids && targetUids.length > 0) {
        // Get tokens for specific users
        const usersSnap = await db.collection("users").where("uid", "in", targetUids).get();
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.fcmTokens) {
            tokens = [...tokens, ...data.fcmTokens];
          }
        });
      } else {
        // Get all tokens
        const usersSnap = await db.collection("users").get();
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.fcmTokens) {
            tokens = [...tokens, ...data.fcmTokens];
          }
        });
      }

      if (tokens.length === 0) {
        return res.json({ success: true, message: "No subscribers found" });
      }

      const payload = {
        notification: {
          title,
          body: message,
        },
        data: {
          url: link || "/",
        },
        tokens: Array.from(new Set(tokens)), // Unique tokens
      };

      const response = await messaging.sendEachForMulticast(payload);
      
      res.json({ 
        success: true, 
        sentCount: response.successCount, 
        failureCount: response.failureCount 
      });
    } catch (error) {
      console.error("Push failed:", error);
      res.status(500).json({ error: "Push failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
