import { Component, OnInit } from '@angular/core';
import { configMigration, itemMigration } from 'src/app/classes/migration';
import { ContentProviderService } from 'src/app/content-provider.service';
import { ContextService } from 'src/app/context.service';

type LogEntry = {
  type: "info" | "warning" | "error"
  message: string
}

@Component({
  selector: 'app-migration',
  templateUrl: './migration.component.html',
  styleUrls: ['./migration.component.scss']
})
export class MigrationComponent implements OnInit {

  busy = false
  log: LogEntry[] = []

  constructor(private contentProvider: ContentProviderService, private context: ContextService) { }
  ngOnInit(): void { }

  async migrate(dryRun: boolean) {

    this.busy = true
    this.contentProvider.compatibilityMode = false

    this.log = []

    try {
      const config = await this.contentProvider.getConfig()

      this.log.push(
        configMigration.isUpdated(config) ?
          { type: "info", message: "Config is up to date" } :
          { type: "warning", message: "Config needs to be migrated" }
      )

      if (!dryRun) {
        configMigration.migrate(config)
        await this.contentProvider.saveConfig(config)
        this.log.push({ type: "info", message: "Config migrated successfully!" })
      }
    } catch (e) {
      this.log.push({ type: "error", message: "Error migrating config: " + e.message })
    }

    const itemRefs = await this.contentProvider.listItems()
    this.log.push({ type: "info", message: `Analyzing ${itemRefs.length} items` })

    for (let ref of itemRefs) {
      try {
        const item = await this.contentProvider.getItem(ref.id)
        this.log.push(itemMigration.isUpdated(item) ?
          { type: "info", message: `Item ${ref.id} is up to date` } :
          { type: "warning", message: `Item ${ref.id} needs to be migrated` }
        );

        if (!dryRun) {
          itemMigration.migrate(item)
          await this.contentProvider.storeItem(item)
          this.log.push({ type: "info", message: `Item ${ref.id} migrated successfully!` })
        }
      } catch (e) {
        this.log.push({ type: "error", message: `Error migrating item ${ref.id}: ${e.message}` })
      }

    }

    this.contentProvider.compatibilityMode = true
    this.busy = false

  }


}
