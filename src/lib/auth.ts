import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import dbConnect from "./mongodb"
import { User } from "./models/User"

// Extend the session user type to include Gemini API key status
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      hasGeminiApiKey?: boolean
    }
    accessToken?: string
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          await dbConnect()
          
          // Check if user exists in our custom User model
          let dbUser = await User.findOne({ email: user.email })
          
          if (!dbUser) {
            // Create new user in our custom User model
            dbUser = new User({
              email: user.email,
              name: user.name,
              lastActive: new Date()
            })
            await dbUser.save()
            console.log('✅ New user created:', user.email)
          } else {
            // Update last active
            dbUser.lastActive = new Date()
            await dbUser.save()
          }
        } catch (error) {
          console.error('Error handling user sign in:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      // Persist the OAuth access_token and or the user id to the token right after signin
      if (account && user) {
        token.accessToken = account.access_token
        token.userId = user.id
      }
      return token
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token and user id from a provider.
      session.accessToken = token.accessToken
      session.user.id = token.userId || session.user.email || ""
      
      // Add Gemini API key status to session
      if (session.user?.email) {
        try {
          await dbConnect()
          const user = await User.findOne(
            { email: session.user.email },
            '+geminiApiKey'
          )
          session.user.hasGeminiApiKey = !!user?.geminiApiKey
        } catch (error) {
          console.error('Error fetching Gemini API key status:', error)
          session.user.hasGeminiApiKey = false
        }
      }
      
      return session
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
} 