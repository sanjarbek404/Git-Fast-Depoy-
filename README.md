
## 🚀 Features

- **AI-Powered Commit Messages**: Automatically generate meaningful commit messages in Uzbek using Google Gemini AI
- **Repository Management**: Create, update, and delete GitHub repositories directly from the app
- **File Deployment**: Drag-and-drop file uploads with progress tracking
- **Deployment History**: Track all deployments with detailed logs and status
- **Analytics Dashboard**: Visualize deployment statistics and trends
- **Progressive Web App**: Install as a desktop app for offline functionality
- **Dark/Light Mode**: Toggle between themes for comfortable usage
- **Real-time Notifications**: Get instant feedback on deployment status
- **Branch Management**: Deploy to specific branches
- **Secure Authentication**: GitHub Personal Access Token (PAT) based authentication

## 📋 Prerequisites

- Node.js (v16 or higher)
- GitHub Personal Access Token with repository permissions
- Google Gemini API Key (optional, for AI commit messages)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/github-autodeploy.git
   cd github-autodeploy
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### GitHub Authentication
1. Generate a Personal Access Token (PAT) from [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Required permissions: `repo` (full control of private repositories)
3. Enter the token in the app's authentication screen

### AI Features (Optional)
- Obtain a Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)
- Add it to `.env.local` as `GEMINI_API_KEY`
- AI commit messages will be generated in Uzbek language

## 📖 Usage

### First Time Setup
1. Launch the app and complete the welcome tour
2. Authenticate with your GitHub PAT
3. Install the PWA for enhanced experience (optional)

### Deploying Files
1. Navigate to the "Deploy" tab
2. Select a repository and branch
3. Drag and drop files or click to browse
4. Review the AI-generated commit message
5. Click "Deploy" to upload files

### Managing Repositories
- **Create**: Use the "Create Repository" button in the dashboard
- **Update**: Click the settings icon on any repository card
- **Delete**: Use the delete option with confirmation

### Viewing Analytics
- Access the "Analytics" tab for deployment statistics
- View charts for deployment frequency and success rates
- Monitor repository activity over time

## 🏗️ Build & Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Server Deployment
The app includes an Express server for production deployment:
```bash
node server.ts
```

## 🔌 API Endpoints

### Generate Commit Message
- **Endpoint:** `POST /api/generate-commit`
- **Body:** `{ "changedFiles": ["file1.txt", "file2.js"] }`
- **Response:** `{ "message": "Generated commit message" }`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Vite](https://vitejs.dev/)
- Styled with [Tailwind CSS](https://tailwindcss.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Animations powered by [Motion](https://motion.dev/)
- Charts by [Recharts](https://recharts.org/)
- 

---

**Made with Sanjarbek404❤️ for developers who value efficiency and automation**
