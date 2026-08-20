"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const SENHA_MIN_CARACTERES = 6;

// Verificação em três camadas (spec-02 §17.2) — esta é a que realmente protege,
// já que Server Actions são endpoints HTTP invocáveis diretamente.
async function exigirAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return { error: "Não autenticado." };
  }
  if (!session.user.ehAdmin) {
    return { error: "Apenas administradores podem gerenciar usuários." };
  }
  return { session };
}

// editarUsuario só expõe nome e senha (spec-02 §17.2) — sem campo de email nem
// de ehAdmin, as travas contra auto-bloqueio ("não alterar o próprio email",
// "não remover o próprio ehAdmin") ficam garantidas pela própria assinatura,
// sem precisar de validação especial para o caso "editando a si mesmo".
function validarNomeSenha({ nome, senha }, { senhaObrigatoria }) {
  if (!nome?.trim()) {
    return { erro: "Informe o nome." };
  }

  if (senhaObrigatoria && !senha) {
    return { erro: "Informe a senha." };
  }

  if (senha && senha.length < SENHA_MIN_CARACTERES) {
    return { erro: `A senha deve ter pelo menos ${SENHA_MIN_CARACTERES} caracteres.` };
  }

  return { valores: { nome: nome.trim(), senha: senha || null } };
}

export async function criarUsuario({ nome, email, senha }) {
  const { error } = await exigirAdmin();
  if (error) {
    return { error };
  }

  if (!email?.trim()) {
    return { error: "Informe o email." };
  }

  const { erro, valores } = validarNomeSenha({ nome, senha }, { senhaObrigatoria: true });
  if (erro) {
    return { error: erro };
  }

  const senhaHash = await bcrypt.hash(valores.senha, 10);

  try {
    await db.usuario.create({
      data: {
        nome: valores.nome,
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

  revalidatePath("/usuarios");
  return { success: true };
}

export async function editarUsuario(id, { nome, senha }) {
  const { error } = await exigirAdmin();
  if (error) {
    return { error };
  }

  const { erro, valores } = validarNomeSenha({ nome, senha }, { senhaObrigatoria: false });
  if (erro) {
    return { error: erro };
  }

  const dados = { nome: valores.nome };
  if (valores.senha) {
    dados.senhaHash = await bcrypt.hash(valores.senha, 10);
  }

  await db.usuario.update({ where: { id }, data: dados });

  revalidatePath("/usuarios");
  return { success: true };
}
