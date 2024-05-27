import { FileMigrationProvider, Migrator } from "kysely"
import { database } from "@coinpusher/core/database"
import { exit } from "process"
import path, { join } from "path"
import { promises as fs } from "node:fs"
import { rootDirectory } from "@coinpusher/core/root"
import { Logger } from "@coinpusher/core/logging"

const logger = new Logger({ path: __filename })

const migrate = async () => {

    const migrator = new Migrator({
        db: database, provider: new FileMigrationProvider({
            fs, path, migrationFolder: join(rootDirectory, "migration")
        })
    })

    const { error } = await migrator.migrateToLatest()

    await database.destroy()

    if(error) {
        logger.error(String(error))
        exit(1)
    } else {
        logger.info("Migration successful")
    }

}

migrate()
