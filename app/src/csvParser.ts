import {CsvResponseRawEntity} from "./type";

export class CsvParser {
  private logger: Console;

  constructor(logger: Console) {
    this.logger = logger;
  }

  public parse(data: string): CsvResponseRawEntity[] {
    if (!this.isValidInput(data)) return [];

    const rows = this.getRows(data);
    if (rows.length === 0) {
      this.logger.warn("No valid rows found in CSV data.");
      return [];
    }

    const headers = this.getHeaders(rows);
    if (!headers || headers.length === 0) {
      this.logger.error("No headers found in CSV data.");
      return [];
    }

    return this.processRows(rows, headers);
  }

  private isValidInput(data: string): boolean {
    const isValid = data && typeof data === "string";
    if (!isValid) {
      this.logger.error("Invalid input data for CSV parsing.");
      return false;
    }
    return isValid;
  }

  private getRows(data: string): string[] {
    return data.split("\n").filter((row) => row.trim() !== "");
  }

  private getHeaders(rows: string[]): string[] | null {
    const headers = rows
      .shift()
      ?.split(",")
      .map((header) => header.trim());
    return headers && headers.length > 0 ? headers : null;
  }

  private processRows(
    rows: string[],
    headers: string[]
  ): CsvResponseRawEntity[] {
    return rows
      .map((row: string) => this.processRow(row, headers))
      .filter((entity) => entity !== null);
  }

  private processRow(
    row: string,
    headers: string[]
  ): CsvResponseRawEntity | null {
    const values = row.split(",").map((value) => value.trim());

    if (values.length !== headers.length) {
      this.logger.warn(`Row has an incorrect number of fields: ${row}`);
      return null;
    }

    return headers.reduce((obj: any, header: string, index: number) => {
      obj[header] = values[index] || null;
      return obj;
    }, {});
  }
}
