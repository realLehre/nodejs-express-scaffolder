import { input, select, checkbox, confirm } from "@inquirer/prompts";
import { spawn } from "node:child_process";

import { generateProject } from "./generator.js";

async function main() {
  console.log("\n🚀 Express Starter CLI\n");

  const projectName = await input({
    message: "Enter your project name",
    default: "my-express-app",
    validate: (input) => {
      if (input.trim() === "" || !input) {
        return "Project name is required";
      }
      return true;
    },
  });

  const language = await select({
    message: "Which language do you want to use?",
    choices: [
      { name: "JavaScript", value: "javascript" },
      { name: "TypeScript", value: "typescript" },
    ],
  });

  const packages = await checkbox({
    message: "Which packages do you want to include?",
    choices: [
      { name: "Mongoose", value: "mongoose" },
      { name: "dotenv - Environment variables", value: "dotenv" },
      {
        name: "cors - Cross-origin requests",
        value: "cors",
      },
      {
        name: "morgan - HTTP request logger middleware for node.js",
        value: "morgan",
      },
    ],
    instructions: "(Use Space to select, Enter to confirm)",
  });

  let confirmMongoose = false;
  if (packages.includes("mongoose")) {
    confirmMongoose = await confirm({
      message: "Do you want to initialize a MongoDB connection setup?",
    });
  }

  console.log("\nYour configuration:\n");

  console.log({
    projectName,
    language,
    packages,
    confirmMongoose,
  });

  const { projectPath, isTypeScript } = await generateProject({
    projectName,
    language,
    packages,
    confirmMongoose,
  });

  console.log("\nInstalling dependencies...");

  const dependencies = ["express", ...packages];
  const devDependencies = ["nodemon"];

  if (isTypeScript) {
    devDependencies.push("typescript", "tsx", "@types/node", "@types/express");
  }

  if (packages.includes("cors") && isTypeScript) {
    devDependencies.push("@types/cors");
  }

  if (packages.includes("morgan") && isTypeScript) {
    devDependencies.push("@types/morgan");
  }

  const install = (args) =>
    new Promise((resolve, reject) => {
      const child = spawn("npm", args, {
        cwd: projectPath,
        stdio: "inherit",
        shell: process.platform === "win32",
      });

      child.on("error", reject);

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`npm exited with code $DIL1`));
        }
      });
    });

  try {
    await install(["install", ...dependencies]);
    await install(["install", "-D", ...devDependencies]);

    console.log("\nProject created successfully!");
    console.log(
      "Next steps:\n  cd " + "" + projectPath + "",
      "\n  npm run dev",
    );
  } catch (error) {
    console.error("\nProject files were created, but installation failed.");
    console.error("Enter the project directory and run npm install manually.");
    console.error(error.message);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  if (error.name === "ExitPromptError") {
    console.log("\nSetup cancelled.");
    process.exitCode = 1;
    return;
  }

  console.error("An error occurred:", error);
  process.exitCode = 1;
});
