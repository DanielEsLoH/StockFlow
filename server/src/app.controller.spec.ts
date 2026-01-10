import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PaginationDto, TestValidationDto } from './common/dto';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('testPagination', () => {
    it('should return pagination validation success message with received dto', () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };

      const result = appController.testPagination(paginationDto);

      expect(result).toEqual({
        message: 'Pagination validation successful',
        received: paginationDto,
      });
    });

    it('should handle custom page and limit values', () => {
      const paginationDto: PaginationDto = { page: 5, limit: 50 };

      const result = appController.testPagination(paginationDto);

      expect(result.received.page).toBe(5);
      expect(result.received.limit).toBe(50);
    });
  });

  describe('testValidation', () => {
    it('should return body validation success message with received dto', () => {
      const validationDto: TestValidationDto = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securePassword123',
      };

      const result = appController.testValidation(validationDto);

      expect(result).toEqual({
        message: 'Body validation successful',
        received: validationDto,
      });
    });

    it('should handle dto with optional fields', () => {
      const validationDto: TestValidationDto = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'anotherSecurePassword',
      };

      const result = appController.testValidation(validationDto);

      expect(result.message).toBe('Body validation successful');
      expect(result.received.name).toBe('Jane Smith');
      expect(result.received.email).toBe('jane@example.com');
    });
  });
});
