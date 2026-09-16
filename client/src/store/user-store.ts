import {create} from 'zustand';
import type { userType } from '../interface/userType';
// import {userType} from '../interface/userType'

const userGlobalStor = create((set) => ({
    currentUser :null,
    setCurrentUser: (user:userType) => set({currentUser:user}),
    // clearCurrentUser: () => set({currentUser:null})
}))

export default userGlobalStor;
