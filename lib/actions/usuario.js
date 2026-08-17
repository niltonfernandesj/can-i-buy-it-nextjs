"use server";

import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export async function criarUsuario({ nome, email, senha }) {
  if (!nome?.trim() || !email?.trim() || !senha) {
    return { error: "Preencha todos os campos." };
  }

  if (senha.length < 6) {
    return { error: "A senha deve ter pelo menos 6 caracteres." };
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    await db.usuario.create({
      data: {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senhaHash,
      },
    });
  } catch (err) {
    if (err.code === "P2002") {
      return { error: "Já existe um usuário cadastrado com este email." };
    }
    throw err;
  }

  return { success: true };
}
