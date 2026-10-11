import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

export async function generateProject({
  projectName,
  language,
  packages,
  confirmMongoose,
}) {
  // Validate the project name before using it as a directory.
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(projectName)) {
    throw new Error(
      "Use lowercase letters, numbers, hyphens or underscores in the project name.",
    );
  }

  const projectPath = path.resolve(process.cwd(), projectName);

  // Never overwrite an existing project.
  try {
    await access(projectPath);
    throw new Error(
      `The directory "${projectName}" already exists. Choose another name.`,
    );
  } catch (error) {
    if (error.message.includes("already exists")) {
      throw error;
    }

    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const isTypeScript = language === "typescript";
  const extension = isTypeScript ? "ts" : "js";

  await mkdir(projectPath);
  await mkdir(path.join(projectPath, "src"));
  if (confirmMongoose) {
    await mkdir(path.join(projectPath, "src/db"), { recursive: true });
  }

  const hasDotenv = packages.includes("dotenv");
  const hasCors = packages.includes("cors");
  const hasHelmet = packages.includes("helmet");
  const hasMorgan = packages.includes("morgan");

  const middlewareImports = [
    hasCors ? "import cors from 'cors';" : "",
    hasDotenv ? "import 'dotenv/config';" : "",
    hasMorgan ? "import morgan from 'morgan';" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const middlewareSetup = [
    hasCors ? "app.use(cors());" : "",
    hasHelmet ? "app.use(helmet());" : "",
    hasMorgan ? "app.use(morgan('dev'));" : "",
  ]
    .filter(Boolean)
    .join("\n");

  const appContent = `import express from 'express';
${middlewareImports}

const app = express();

app.use(express.json());
${middlewareSetup}

  
app.get('/', (_req, res) => {
  res.json({
    message: 'Express server is running!'
  });
});

export default app;
`;

  const serverStartup = confirmMongoose
    ? `
const startServer = async () => {
  await connectToDatabase(process.env.MONGODB_URI);
  app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
  });
};
    
startServer();`
    : `app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
    `;

  const serverContent = `
${hasDotenv ? "import 'dotenv/config';" : ""}

${confirmMongoose ? "import connectToDatabase from './db/dbConnection';" : ""}
import app from './app${isTypeScript ? "" : ".js"}';

// create a .env file and add your environment variables
const PORT = process.env.PORT || 3000;

${serverStartup}
`.trimStart();

  const dbConnectionContent = `import mongoose from 'mongoose';

const connectToDatabase = async (uri${isTypeScript ? ": string" : ""}) => {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
};

export default connectToDatabase;
    `;

  const packageJson = {
    name: projectName,
    version: "1.0.0",
    private: true,
    scripts: isTypeScript
      ? {
          dev: "nodemon",
          build: "tsc",
          start: "node dist/server.js",
        }
      : {
          dev: "nodemon src/server.js",
          start: "node src/server.js",
        },
    dependencies: {},
    devDependencies: {},
  };

  if (!isTypeScript) packageJson["type"] = "module";

  const tsconfig = {
    compilerOptions: {
      target: "ES2022",
      module: "CommonJs",
      rootDir: "./src",
      outDir: "./dist",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ["src/**/*.ts"],
    exclude: ["node_modules", "dist"],
  };

  const nodemon = {
    watch: ["src"],
    ext: "ts",
    ignore: ["src/**/*.spec.ts"],
    exec: "ts-node ./src/server.ts",
  };

  const files = [
    {
      name: `src/app.${extension}`,
      content: appContent,
    },
    {
      name: `src/server.${extension}`,
      content: serverContent,
    },
    {
      name: ".gitignore",
      content: `node_modules/\ndist/\n.env\n`,
    },
    {
      name: ".env.example",
      content: "PORT=3000\nMONGODB_URI=test\n",
    },
    {
      name: "README.md",
      content: `# ${projectName}\n\nGenerated with Express Starter CLI.\n\n## Getting started\n\n1. Run \`npm install\`.\n2. Run \`npm run dev\`.\n\nThe server runs on port 3000 by default.\n`,
    },
  ];

  files.push({
    name: "package.json",
    content: JSON.stringify(packageJson, null, 2),
  });

  if (confirmMongoose) {
    files.push({
      name: `src/db/dbConnection.${extension}`,
      content: dbConnectionContent,
    });
  }
  if (isTypeScript) {
    files.push(
      {
        name: "tsconfig.json",
        content: JSON.stringify(tsconfig, null, 2),
      },
      {
        name: "nodemon.json",
        content: JSON.stringify(nodemon, null, 2),
      },
    );
  }

  for (const file of files) {
    await writeFile(path.join(projectPath, file.name), file.content);
  }

  return {
    projectPath,
    isTypeScript,
    packages,
  };
}
