import {default as axios} from "axios";
import fs from "fs";
import {chunk} from "lodash";
import mongoose from "mongoose";
import sharp from "sharp";
import {CsvParser} from "./csvParser";
import {ImageSchema} from "./model";
import {
  CsvResponseRawEntity,
  ImageProcessorConfigType,
  RawEntity,
  ThumbnailResponse,
} from "./type";

mongoose.connect(process.env.MONGO_URI || "");
const ImageModel = mongoose.model("Image", ImageSchema);

export class ImageProcessor {
  private readonly THUMBNAIL_SIZE = {width: 100, height: 100};
  private logger: Console;
  private csvParser: CsvParser;

  constructor(private config: ImageProcessorConfigType) {
    this.logger = console;
    this.csvParser = new CsvParser(this.logger);
  }

  private createRawEntity({index, id, url}: CsvResponseRawEntity) {
    return {
      index,
      id,
      url,
      thumbnail: null,
    };
  }

  private getData(): RawEntity[] {
    const data = fs.readFileSync(this.config.filePath, "utf-8");
    const rows: CsvResponseRawEntity[] = this.csvParser.parse(data);
    return rows.map((row) => this.createRawEntity(row));
  }

  private async addNewImages(images: any[]) {
    await ImageModel.insertMany(images, {ordered: false});
  }

  private displayChunkInfo(chunk: RawEntity[]) {
    const lastIndex = chunk.length - 1;
    const lastChunk = chunk[lastIndex];
    console.log("--------------------");
    this.logger.info(`Processed batch size: ${this.config.batchSize}`);
    this.logger.info(`Last processed index: ${lastChunk.index}`);
    this.logger.info(`Last processed ID: ${lastChunk.id}`);
    console.log("--------------------");
  }

  private cleanMemory() {
    if (global.gc) global.gc();
  }

  private async processChunks(rawList: RawEntity[], batchSize: number) {
    const chunks = chunk(rawList, batchSize).map((chunk) =>
      this.processChunk(chunk)
    );
    return Promise.all(chunks);
  }

  async start() {
    const rawData = this.getData();
    await this.processChunks(rawData, this.config.batchSize);
    console.log("All chunks processed");
  }

  async processChunk(chunk: RawEntity[]) {
    try {
      const images = await this.createThumbnails(chunk);
      if (images.length) await this.addNewImages(images);
      this.displayChunkInfo(chunk);
      this.cleanMemory();
    } catch (error: any) {
      this.logger.error(`Error processing batch: ${error.message}`);
    }
  }

  private async createThumbnails(rawEntities: RawEntity[]) {
    const tasks = rawEntities.map((rawEntity) => this.getThumbnail(rawEntity));
    const images = await Promise.all(tasks);
    return images.filter((image) => image !== null);
  }

  createThumbnail(rawEntity: RawEntity, buffer: Buffer) {
    rawEntity.thumbnail = buffer;
    delete rawEntity.url;
    return rawEntity;
  }

  async getThumbnail(rawEntity: RawEntity) {
    try {
      const response: ThumbnailResponse = await axios.get(rawEntity.url || "", {
        responseType: "arraybuffer",
      });
      const buffer = await sharp(response.data)
        .resize(this.THUMBNAIL_SIZE.width, this.THUMBNAIL_SIZE.height)
        .toBuffer();
      return this.createThumbnail(rawEntity, buffer);
    } catch (error: any) {
      this.logger.error(
        `Error creating thumbnail for ID ${rawEntity.id}: ${error.message}`
      );
      return null;
    }
  }
}
