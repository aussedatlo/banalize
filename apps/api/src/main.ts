import { Logger, LogLevel, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const loggerLevels: LogLevel[] = ["error", "warn", "log"];
  if (process.env.BANALIZE_API_LOG_DEBUG === "true") {
    loggerLevels.push("debug");
  }
  const app = await NestFactory.create(AppModule, {
    logger: loggerLevels,
  });

  const config = new DocumentBuilder()
    .setTitle("Banalize API")
    .setDescription("The Banalize API description")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe());

  // Enable shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.BANALIZE_API_SERVER_PORT || 5000;
  logger.log(`Server running on port ${port}`);
  await app.listen(port);
}
bootstrap();
