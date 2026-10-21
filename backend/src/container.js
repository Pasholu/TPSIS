import { Database } from './db/Database.js';
import { DatabaseMigrator } from './db/DatabaseMigrator.js';
import { BaseRepository } from './repositories/BaseRepository.js';
import { FurnaceRepository } from './repositories/FurnaceRepository.js';
import { CementGradeRepository } from './repositories/CementGradeRepository.js';
import { ProductionTaskRepository } from './repositories/ProductionTaskRepository.js';
import { LabSampleRepository } from './repositories/LabSampleRepository.js';
import { ReferenceItemRepository } from './repositories/ReferenceItemRepository.js';
import { SensorReadingRepository } from './repositories/SensorReadingRepository.js';
import { ToleranceService } from './services/ToleranceService.js';
import { LabSampleService } from './services/LabSampleService.js';
import { ReferenceService } from './services/ReferenceService.js';
import { CementGradeCategory, TextReferenceCategory, requireRange } from './services/referenceCategories.js';
import { DocumentService } from './services/DocumentService.js';
import { LocalFileStorage } from './services/LocalFileStorage.js';
import { FurnaceService } from './services/FurnaceService.js';
import { EnergyService } from './services/EnergyService.js';
import { SensorSimulator } from './services/SensorSimulator.js';
import { CatalogController } from './controllers/CatalogController.js';
import { LabSampleController } from './controllers/LabSampleController.js';
import { ReferenceController } from './controllers/ReferenceController.js';
import { FurnaceController } from './controllers/FurnaceController.js';
import { EnergyController } from './controllers/EnergyController.js';

// Корень композиции: единственное место, где создаются объекты и связываются зависимости.
export const createContainer = (config) => {
  const db = new Database(config.databaseUrl);

  const furnaces = new FurnaceRepository(db);
  const grades = new CementGradeRepository(db);
  const operators = new BaseRepository(db, 'operator', 'operator_id');
  const laborers = new BaseRepository(db, 'laborer', 'laborer_id');
  const tasks = new ProductionTaskRepository(db);
  const samples = new LabSampleRepository(db);
  const referenceItems = new ReferenceItemRepository(db);
  const readings = new SensorReadingRepository(db);

  const tolerances = new ToleranceService({ referenceItems });
  const labSamples = new LabSampleService({ db, samples, tasks, furnaces, grades, tolerances });
  const documents = new DocumentService({ items: referenceItems, storage: new LocalFileStorage(config.uploadDir) });
  const references = new ReferenceService({
    cementTypes: new CementGradeCategory(grades),
    tempRegimes: new TextReferenceCategory({ key: 'tempRegimes', items: referenceItems }),
    tolerances: new TextReferenceCategory({ key: 'tolerances', items: referenceItems, validateValue: requireRange }),
    recipes: new TextReferenceCategory({ key: 'recipes', items: referenceItems }),
    standards: new TextReferenceCategory({
      key: 'standards',
      items: referenceItems,
      withUrl: true,
      onRemove: (id) => documents.removeFile(id),
    }),
  });
  const furnaceService = new FurnaceService({ furnaces, readings });
  const energyService = new EnergyService({ readings });

  return {
    db,
    migrator: new DatabaseMigrator({ db, tolerances }),
    simulator: new SensorSimulator({ readings, intervalMs: config.sensorIntervalMs }),
    controllers: [
      new CatalogController({
        furnaces,
        'cement-grades': grades,
        operators,
        laborers,
        'production-tasks': { findAll: () => tasks.findAllDetailed() },
      }),
      new LabSampleController({ labSamples, tolerances }),
      new ReferenceController({ references, documents, maxPdfBytes: config.maxPdfBytes }),
      new FurnaceController({ furnaceService }),
      new EnergyController({ energyService }),
    ],
  };
};
