/**
 * Servicio para manejo de información de usuarios
 */

import { BaseApiService } from "./base.service";
import { ApiResponse } from "@/types/api.types";
import { UsersInfoResponse } from "@/types/user.types";

class UserService extends BaseApiService {
  /**
   * Obtener información de múltiples usuarios de Clerk
   */
  async getUsersInfo(userIds: string[]): Promise<ApiResponse<UsersInfoResponse>> {
    return this.post(`/users/info`, { userIds });
  }
}

export const userService = new UserService();
