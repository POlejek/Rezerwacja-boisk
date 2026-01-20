import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  query, 
  where,
  serverTimestamp,
  deleteDoc,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUserProfile } from './user.service';
import { getTeam } from './team.service';
import { hasPermission, getUserPermissions, getUserContext } from './permissions.service';

export interface Player {
  id: string;
  name: string;
  dateOfBirth?: string;
  teamId: string;
  clubId: string;
  parentIds: string[]; // UIDs rodziców
  notes?: string;
  medicalInfo?: string;
  isActive: boolean; // Zmiana z active na isActive
  createdAt: any;
  createdBy?: string;
}

// Pobranie wszystkich zawodników zespołu
export async function getPlayersByTeam(teamId: string): Promise<Player[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.read')) {
    throw new Error('No permission to read players');
  }
  
  // Sprawdź context - trainer może widzieć tylko graczy ze swoich teamów
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.teamIds && !context.teamIds.includes(teamId)) {
      throw new Error('Can only view players from your teams');
    }
  }
  
  const q = query(collection(db, 'players'), where('teamId', '==', teamId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
}

// Pobranie wszystkich zawodników klubu
export async function getPlayersByClub(clubId: string): Promise<Player[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.read')) {
    throw new Error('No permission to read players');
  }
  
  // Sprawdź context
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId !== clubId) {
      throw new Error('Can only view players from your club');
    }
  }
  
  const q = query(collection(db, 'players'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
}

// Pobranie wszystkich zawodników (dla superadmina)
export async function getAllPlayers(): Promise<Player[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.read')) {
    throw new Error('No permission to read players');
  }
  
  const snapshot = await getDocs(collection(db, 'players'));
  const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Player));
  
  // Jeśli nie jest superadmin, filtruj
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    
    // Coordinator - tylko z klubu
    if (context.clubId) {
      return players.filter(p => p.clubId === context.clubId);
    }
    
    // Trainer - tylko ze swoich teamów
    if (context.teamIds && context.teamIds.length > 0) {
      return players.filter(p => context.teamIds!.includes(p.teamId));
    }
    
    // Parent - tylko swoje dzieci
    if (context.playerIds && context.playerIds.length > 0) {
      return players.filter(p => context.playerIds!.includes(p.id));
    }
  }
  
  return players;
}

// Pobranie pojedynczego zawodnika
export async function getPlayer(playerId: string): Promise<Player | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.read')) {
    throw new Error('No permission to read players');
  }
  
  const playerDoc = await getDoc(doc(db, 'players', playerId));
  if (!playerDoc.exists()) {
    return null;
  }
  
  const player = { id: playerDoc.id, ...playerDoc.data() } as Player;
  
  // Sprawdź context
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    
    // Parent może widzieć tylko swoje dziecko
    if (context.playerIds && context.playerIds.length > 0) {
      if (!context.playerIds.includes(playerId)) {
        throw new Error('Can only view your own children');
      }
    }
    // Coordinator - tylko z klubu
    else if (context.clubId && player.clubId !== context.clubId) {
      throw new Error('Can only view players from your club');
    }
    // Trainer - tylko ze swoich teamów
    else if (context.teamIds && !context.teamIds.includes(player.teamId)) {
      throw new Error('Can only view players from your teams');
    }
  }
  
  return player;
}

// Utworzenie zawodnika
export async function createPlayer(
  playerData: Omit<Player, 'id' | 'createdAt' | 'createdBy'>
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.write')) {
    throw new Error('No permission to create players');
  }
  
  // Sprawdź czy zespół istnieje
  const team = await getTeam(playerData.teamId);
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Sprawdź context
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    
    // Coordinator może dodawać zawodników tylko w swoim klubie
    if (context.clubId && team.clubId !== context.clubId) {
      throw new Error('Can only create players in your club');
    }
    
    // Trainer może dodawać zawodników tylko w swoim zespole
    if (context.teamIds && !context.teamIds.includes(playerData.teamId)) {
      throw new Error('Can only create players in your teams');
    }
  }
  
  const playerRef = doc(collection(db, 'players'));
  await setDoc(playerRef, {
    ...playerData,
    clubId: team.clubId, // Automatycznie przypisz clubId z zespołu
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid
  });
  
  return playerRef.id;
}

// Aktualizacja zawodnika
export async function updatePlayer(
  playerId: string,
  updates: Partial<Player>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.write')) {
    throw new Error('No permission to update players');
  }
  
  const player = await getPlayer(playerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  // Sprawdź context
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    
    // Parent może edytować tylko podstawowe dane swojego dziecka
    if (context.playerIds && context.playerIds.includes(playerId)) {
      // Parent może edytować tylko wybrane pola
      const allowedFields = ['notes', 'medicalInfo'];
      const updateKeys = Object.keys(updates);
      if (!updateKeys.every(key => allowedFields.includes(key))) {
        throw new Error('Parents can only update notes and medical info');
      }
    }
    // Coordinator może edytować tylko zawodników swojego klubu
    else if (context.clubId && player.clubId !== context.clubId) {
      throw new Error('Can only update players in your club');
    }
    // Trainer może edytować tylko zawodników swojego zespołu
    else if (context.teamIds && !context.teamIds.includes(player.teamId)) {
      throw new Error('Can only update players in your teams');
    }
  }
  
  await updateDoc(doc(db, 'players', playerId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

// Usunięcie zawodnika (soft delete)
export async function deletePlayer(playerId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.delete')) {
    throw new Error('No permission to delete players');
  }
  
  await updatePlayer(playerId, {
    isActive: false
  });
}

// Przypisanie rodzica do zawodnika
export async function addParentToPlayer(
  playerId: string,
  parentId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.manage_parents')) {
    throw new Error('No permission to manage player parents');
  }
  
  const player = await getPlayer(playerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  const parentProfile = await getUserProfile(parentId);
  if (!parentProfile) {
    throw new Error('Parent not found');
  }
  
  // Dodaj playerId do parentIds zawodnika (jeśli nie ma już)
  if (!player.parentIds.includes(parentId)) {
    await updateDoc(doc(db, 'players', playerId), {
      parentIds: arrayUnion(parentId)
    });
  }
  
  // Zaktualizuj profil rodzica - dodaj playerId do playerIds
  const currentPlayerIds = parentProfile.playerIds || [];
  if (!currentPlayerIds.includes(playerId)) {
    await updateDoc(doc(db, 'users', parentId), {
      playerIds: arrayUnion(playerId),
      clubId: player.clubId, // Ustaw clubId rodzica
      teamIds: arrayUnion(player.teamId) // Dodaj teamId
    });
  }
}

// Usunięcie rodzica z zawodnika
export async function removeParentFromPlayer(
  playerId: string,
  parentId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'players.manage_parents')) {
    throw new Error('No permission to manage player parents');
  }
  
  const player = await getPlayer(playerId);
  if (!player) {
    throw new Error('Player not found');
  }
  
  // Usuń playerId z parentIds zawodnika
  await updateDoc(doc(db, 'players', playerId), {
    parentIds: arrayRemove(parentId)
  });
  
  // Zaktualizuj profil rodzica - usuń playerId z playerIds
  await updateDoc(doc(db, 'users', parentId), {
    playerIds: arrayRemove(playerId),
    teamIds: arrayRemove(player.teamId)
  });
}
