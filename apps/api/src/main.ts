import { Logger, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle("Banalize API")
    .setDescription("The Banalize API description")
    .setVersion("1.0")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);

  // Enable validation globally
  app.useGlobalPipes(new ValidationPipe());

  const port = process.env.SERVER_PORT || 5000;
  logger.log(`Server running on port ${port}`);
  await app.listen(port);
}
bootstrap();
