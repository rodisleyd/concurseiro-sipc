import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: any[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const studyService = {
  async testConnection() {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if(error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  },

  async saveUser(userData: any) {
    const path = `users/${userData.uid}`;
    try {
      await setDoc(doc(db, 'users', userData.uid), {
        ...userData,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  },

  async getUser(uid: string) {
    const path = `users/${uid}`;
    try {
      const docSnap = await getDoc(doc(db, 'users', uid));
      return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }
  },

  async addSession(userId: string, sessionData: any) {
    const path = `users/${userId}/sessions`;
    try {
      await addDoc(collection(db, 'users', userId, 'sessions'), {
        ...sessionData,
        userId,
        startTime: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToSessions(userId: string, callback: (sessions: any[]) => void) {
    const path = `users/${userId}/sessions`;
    const q = query(collection(db, 'users', userId, 'sessions'));
    return onSnapshot(q, (snapshot) => {
      const sessions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(sessions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async addRevision(userId: string, revisionData: any) {
    const path = `users/${userId}/revisions`;
    try {
      await addDoc(collection(db, 'users', userId, 'revisions'), {
        ...revisionData,
        userId,
        status: 'pending'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToRevisions(userId: string, callback: (revisions: any[]) => void) {
    const path = `users/${userId}/revisions`;
    const q = query(collection(db, 'users', userId, 'revisions'), where('status', '==', 'pending'));
    return onSnapshot(q, (snapshot) => {
      const revisions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(revisions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveGalpaoChunks(userId: string, fileName: string, chunks: {title: string, content: string}[]) {
    const path = `users/${userId}/galpao`;
    const sourceId = new Date().getTime().toString();
    
    try {
      for (const [index, chunk] of chunks.entries()) {
        await addDoc(collection(db, 'users', userId, 'galpao'), {
          userId,
          fileName,
          sourceId,
          order: index,
          title: chunk.title,
          content: chunk.content,
          createdAt: new Date().toISOString()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  },

  subscribeToGalpao(userId: string, callback: (materials: any[]) => void) {
    const path = `users/${userId}/galpao`;
    const q = query(collection(db, 'users', userId, 'galpao'));
    return onSnapshot(q, (snapshot) => {
      const materials = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordena por sourceId (documento) e order (pedaco)
      materials.sort((a, b) => {
        if (a.sourceId === b.sourceId) return a.order - b.order;
        return b.sourceId.localeCompare(a.sourceId);
      });
      callback(materials);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });
  },

  async saveProcessedChunk(userId: string, chunkId: string, processedData: { summaryData?: any, mindMapData?: any, questionsData?: any }) {
    const path = `users/${userId}/galpao/${chunkId}`;
    try {
      await updateDoc(doc(db, 'users', userId, 'galpao', chunkId), {
        ...processedData,
        processedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  },
  
  async deleteGalpaoChunk(userId: string, chunkId: string) {
    const path = `users/${userId}/galpao/${chunkId}`;
    try {
      await deleteDoc(doc(db, 'users', userId, 'galpao', chunkId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  },

  async deleteGalpaoMaterial(userId: string, sourceId: string) {
    const path = `users/${userId}/galpao [Batch]`;
    try {
      const q = query(collection(db, 'users', userId, 'galpao'), where('sourceId', '==', sourceId));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }
};
