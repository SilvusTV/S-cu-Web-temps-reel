import jwt from 'jsonwebtoken'
export const insecure = () => jwt.sign({ sub: 'attacker' }, '38c35b858b69a2edbe1e8c7cfcb6470cf6a223b668e23cc776cb002227d9c456')
