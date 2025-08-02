import { UserService } from "../users/users.service";
import { hashPassword } from "./auth.middleware";
import { InsertUser, User } from "../../../shared/schema";

export class AuthService {
  private userService = new UserService();

  async register(userData: InsertUser): Promise<User> {
    // Check if user already exists
    const existingUser = await this.userService.getUserByUsername(userData.username);
    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(userData.password);
    
    return await this.userService.createUser({
      ...userData,
      password: hashedPassword,
    });
  }
}