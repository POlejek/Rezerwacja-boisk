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
  deleteDoc
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { getUserProfile } from './user.service';
import { hasPermission, getUserPermissions, getUserContext } from './permissions.service';

export interface Team {
  id: string;
  name: string;
  clubId: string;
  coordinatorId?: string;
  trainerIds?: string[]; // Zmiana z trainerId na trainerIds (array)
  ageGroup?: string; // np. "U12", "U15", "Senior"
  description?: string;
  isActive: boolean; // Zmiana z active na isActive
  createdAt: any;
  createdBy?: string;
}

// Pobranie wszystkich zespołów klubu
export async function getTeamsByClub(clubId: string): Promise<Team[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.read')) {
    throw new Error('No permission to read teams');
  }
  
  // Sprawdź context - coordinator może widzieć tylko teamy swojego klubu
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId !== clubId) {
      throw new Error('Can only view teams from your club');
    }
  }
  
  const q = query(collection(db, 'teams'), where('clubId', '==', clubId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
}

// Pobranie wszystkich zespołów (dla superadmina)
export async function getAllTeams(): Promise<Team[]> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.read')) {
    throw new Error('No permission to read teams');
  }
  
  const snapshot = await getDocs(collection(db, 'teams'));
  const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
  
  // Jeśli nie jest superadmin, filtruj po clubId lub teamIds
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId) {
      return teams.filter(t => t.clubId === context.clubId);
    } else if (context.teamIds && context.teamIds.length > 0) {
      return teams.filter(t => context.teamIds!.includes(t.id));
    }
  }
  
  return teams;
}

// Pobranie pojedynczego zespołu
export async function getTeam(teamId: string): Promise<Team | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.read')) {
    throw new Error('No permission to read teams');
  }
  
  const teamDoc = await getDoc(doc(db, 'teams', teamId));
  if (!teamDoc.exists()) {
    return null;
  }
  
  const team = { id: teamDoc.id, ...teamDoc.data() } as Team;
  
  // Sprawdź context - coordinator może widzieć tylko teamy swojego klubu
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId && team.clubId !== context.clubId) {
      throw new Error('Can only view teams from your club');
    }
    // Trainer może widzieć tylko swoje teamy
    if (context.teamIds && !context.teamIds.includes(teamId)) {
      throw new Error('Can only view your own teams');
    }
  }
  
  return team;
}

// Utworzenie zespołu
export async function createTeam(
  teamData: Omit<Team, 'id' | 'createdAt' | 'createdBy'>
): Promise<string> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.write')) {
    throw new Error('No permission to create teams');
  }
  
  // Coordinator może tworzyć zespoły tylko w swoim klubie
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId !== teamData.clubId) {
      throw new Error('Can only create teams in your club');
    }
  }
  
  const teamRef = doc(collection(db, 'teams'));
  await setDoc(teamRef, {
    ...teamData,
    createdAt: serverTimestamp(),
    createdBy: currentUser.uid
  });
  
  return teamRef.id;
}

// Aktualizacja zespołu
export async function updateTeam(
  teamId: string,
  updates: Partial<Team>
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.write')) {
    throw new Error('No permission to update teams');
  }
  
  const team = await getTeam(teamId);
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Coordinator może edytować tylko zespoły swojego klubu
  if (!hasPermission(permissions, '*.*')) {
    const context = await getUserContext(currentUser.uid);
    if (context.clubId !== team.clubId) {
      throw new Error('Can only update teams in your club');
    }
  }
  
  await updateDoc(doc(db, 'teams', teamId), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

// Usunięcie zespołu (soft delete)
export async function deleteTeam(teamId: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.delete')) {
    throw new Error('No permission to delete teams');
  }
  
  await updateTeam(teamId, {
    isActive: false
  });
}

// Przypisanie trenera do zespołu
export async function assignTrainerToTeam(
  teamId: string,
  trainerId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('Not authenticated');
  }
  
  // Sprawdź uprawnienia
  const permissions = await getUserPermissions(currentUser.uid);
  if (!hasPermission(permissions, 'teams.assign_trainers')) {
    throw new Error('No permission to assign trainers');
  }
  
  const trainerProfile = await getUserProfile(trainerId);
  if (!trainerProfile) {
    throw new Error('Trainer not found');
  }
  
  const team = await getTeam(teamId);
  if (!team) {
    throw new Error('Team not found');
  }
  
  // Dodaj trainera do listy trainerIds (jeśli nie ma już)
  const currentTrainerIds = team.trainerIds || [];
  if (!currentTrainerIds.includes(trainerId)) {
    await updateTeam(teamId, {
      trainerIds: [...currentTrainerIds, trainerId]
    });
    
    // Dodaj teamId do użytkownika trenera
    const trainerTeamIds = trainerProfile.teamIds || [];
    if (!trainerTeamIds.includes(teamId)) {
      await updateDoc(doc(db, 'users', trainerId), {
        teamIds: [...trainerTeamIds, teamId]
      });
    }
  }
}
