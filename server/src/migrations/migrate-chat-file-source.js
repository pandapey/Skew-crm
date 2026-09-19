import mongoose from 'mongoose'
import { FileItem } from '../models/fileModels.js'

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://teammate282024_db_user:LJczRHTLAxg5itd2@cluster0.aqys1ru.mongodb.net/Skew?appName=Cluster0'

await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 8000 })

const result = await FileItem.updateMany(
  { url: { $regex: '^/chat-uploads/' }, source: { $ne: 'chat' } },
  { $set: { source: 'chat' } }
)

console.log(`chat-uploads FileItems backfilled to source:'chat': matched=${result.matchedCount} modified=${result.modifiedCount}`)
console.log('general files left untouched (url not under /chat-uploads/)')

await mongoose.disconnect()
