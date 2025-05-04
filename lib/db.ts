// Tipos de datos para la base de datos
export interface User {
  id: string
  name: string
  email: string
  photoUrl: string // Base64 de la imagen
  createdAt: string
}

// Clase para manejar la base de datos de usuarios
export class UserDatabase {
  private static USERS_KEY = "mirai_users"
  private static CURRENT_USER_KEY = "mirai_current_user"

  // Obtener todos los usuarios
  static getUsers(): User[] {
    if (typeof window === "undefined") return []

    const usersJson = localStorage.getItem(this.USERS_KEY)
    if (!usersJson) return []

    try {
      return JSON.parse(usersJson)
    } catch (e) {
      console.error("Error parsing users from localStorage:", e)
      return []
    }
  }

  // Guardar todos los usuarios
  private static saveUsers(users: User[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
  }

  // Crear un nuevo usuario
  static createUser(userData: Omit<User, "id" | "createdAt">): User {
    const users = this.getUsers()

    // Verificar si el email ya existe
    if (users.some((user) => user.email === userData.email)) {
      throw new Error("El correo electrónico ya está registrado")
    }

    const newUser: User = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    users.push(newUser)
    this.saveUsers(users)

    return newUser
  }

  // Buscar usuario por email
  static findUserByEmail(email: string): User | undefined {
    const users = this.getUsers()
    return users.find((user) => user.email === email)
  }

  // Buscar usuario por ID
  static findUserById(id: string): User | undefined {
    const users = this.getUsers()
    return users.find((user) => user.id === id)
  }

  // Establecer usuario actual
  static setCurrentUser(userId: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.CURRENT_USER_KEY, userId)
  }

  // Obtener usuario actual
  static getCurrentUser(): User | null {
    if (typeof window === "undefined") return null

    const userId = localStorage.getItem(this.CURRENT_USER_KEY)
    if (!userId) return null

    const user = this.findUserById(userId)
    return user || null
  }

  // Cerrar sesión
  static logout(): void {
    if (typeof window === "undefined") return
    localStorage.removeItem(this.CURRENT_USER_KEY)
  }

  // Simular reconocimiento facial
  // En una aplicación real, esto utilizaría algoritmos de comparación de imágenes
  static simulateFacialRecognition(): User | null {
    // En una implementación real, aquí se compararía la imagen capturada
    // con las imágenes almacenadas de los usuarios

    // Para esta simulación, simplemente devolvemos el primer usuario
    const users = this.getUsers()
    if (users.length === 0) return null

    const recognizedUser = users[0]
    this.setCurrentUser(recognizedUser.id)
    return recognizedUser
  }
}
