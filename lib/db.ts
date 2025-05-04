// Tipos de datos para la base de datos
export interface User {
  id: string
  name: string
  email: string
  photoUrl: string // Base64 de la imagen
  createdAt: string
  hasCompletedPairing?: boolean
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  phone?: string
  photoUrl?: string
  createdAt: string
}

// Clase para manejar la base de datos de usuarios
export class UserDatabase {
  static USERS_KEY = "mirai_users" // Cambiado a static público para acceso directo
  static CURRENT_USER_KEY = "mirai_current_user"
  static FAMILY_MEMBERS_KEY = "mirai_family_members"

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
  static saveUsers(users: User[]): void {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
      console.log("Usuarios guardados correctamente:", users)
    } catch (e) {
      console.error("Error saving users to localStorage:", e)
    }
  }

  // Crear un nuevo usuario
  static createUser(userData: Omit<User, "id" | "createdAt">): User {
    const users = this.getUsers()
    console.log("Usuarios existentes:", users)

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
    console.log("Nuevo usuario creado:", newUser)

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

  // Actualizar un usuario existente
  static updateUser(userId: string, userData: Partial<Omit<User, "id" | "createdAt">>): User | null {
    const users = this.getUsers()
    const userIndex = users.findIndex((user) => user.id === userId)

    if (userIndex === -1) return null

    // Actualizar los campos proporcionados
    users[userIndex] = {
      ...users[userIndex],
      ...userData,
    }

    this.saveUsers(users)
    return users[userIndex]
  }

  // Establecer usuario actual
  static setCurrentUser(userId: string): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.CURRENT_USER_KEY, userId)
    console.log("Usuario actual establecido:", userId)
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

  // MÉTODOS PARA FAMILIARES

  // Obtener todos los familiares
  static getFamilyMembers(): FamilyMember[] {
    if (typeof window === "undefined") return []

    const membersJson = localStorage.getItem(this.FAMILY_MEMBERS_KEY)
    if (!membersJson) return []

    try {
      return JSON.parse(membersJson)
    } catch (e) {
      console.error("Error parsing family members from localStorage:", e)
      return []
    }
  }

  // Guardar todos los familiares
  private static saveFamilyMembers(members: FamilyMember[]): void {
    if (typeof window === "undefined") return
    localStorage.setItem(this.FAMILY_MEMBERS_KEY, JSON.stringify(members))
  }

  // Crear un nuevo familiar
  static createFamilyMember(memberData: Omit<FamilyMember, "id" | "createdAt">): FamilyMember {
    const members = this.getFamilyMembers()

    const newMember: FamilyMember = {
      ...memberData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    }

    members.push(newMember)
    this.saveFamilyMembers(members)

    return newMember
  }

  // Buscar familiar por ID
  static findFamilyMemberById(id: string): FamilyMember | undefined {
    const members = this.getFamilyMembers()
    return members.find((member) => member.id === id)
  }

  // Eliminar familiar
  static deleteFamilyMember(id: string): boolean {
    const members = this.getFamilyMembers()
    const initialLength = members.length

    const filteredMembers = members.filter((member) => member.id !== id)
    this.saveFamilyMembers(filteredMembers)

    return filteredMembers.length < initialLength
  }

  // Limpiar toda la base de datos
  static clearDatabase(): void {
    if (typeof window === "undefined") return

    // Eliminar todos los datos almacenados
    localStorage.removeItem(this.USERS_KEY)
    localStorage.removeItem(this.CURRENT_USER_KEY)
    localStorage.removeItem(this.FAMILY_MEMBERS_KEY)

    console.log("Base de datos limpiada correctamente")
  }
}
