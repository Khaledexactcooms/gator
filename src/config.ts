import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export type Config = {
  dbUrl: string;
  currentUserName?: string;
};

export function setUser(userName: string): void {
  const config = readConfig();

  config.currentUserName = userName;

  writeConfig(config);
}

export function readConfig(): Config {
  const configPath = getConfigFilePath();

  const fileContent = fs.readFileSync(configPath, {
    encoding: "utf-8",
  });

  const rawConfig: unknown = JSON.parse(fileContent);

  return validateConfig(rawConfig);
}

function getConfigFilePath(): string {
  return path.join(os.homedir(), ".gatorconfig.json");
}

function writeConfig(config: Config): void {
  const configPath = getConfigFilePath();

  const rawConfig = {
    db_url: config.dbUrl,
    current_user_name: config.currentUserName,
  };

  fs.writeFileSync(
    configPath,
    JSON.stringify(rawConfig, null, 2) + "\n",
    {
      encoding: "utf-8",
    },
  );
}

function validateConfig(rawConfig: unknown): Config {
  if (typeof rawConfig !== "object" || rawConfig === null) {
    throw new Error("Invalid configuration file");
  }

  if (
    !("db_url" in rawConfig) ||
    typeof rawConfig.db_url !== "string"
  ) {
    throw new Error("Invalid database URL");
  }

  let currentUserName: string | undefined;

  if ("current_user_name" in rawConfig) {
    const value = rawConfig.current_user_name;

    if (value !== undefined && typeof value !== "string") {
      throw new Error("Invalid current user name");
    }

    currentUserName = value;
  }

  return {
    dbUrl: rawConfig.db_url,
    currentUserName,
  };
}
