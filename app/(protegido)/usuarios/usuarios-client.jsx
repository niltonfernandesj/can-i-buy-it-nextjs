"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ShieldAlert } from "lucide-react";
import { criarUsuario, editarUsuario } from "@/lib/actions/usuarios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

function NovoUsuarioDialog({ aberto, onOpenChange, onCriado }) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  function resetar(open) {
    onOpenChange(open);
    if (!open) {
      setNome("");
      setEmail("");
      setSenha("");
      setErro("");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await criarUsuario({ nome, email, senha });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    resetar(false);
    onCriado();
  }

  return (
    <Dialog open={aberto} onOpenChange={resetar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-md border border-alerta-borda bg-alerta-fundo p-3 text-sm text-destructive">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Qualquer usuário criado aqui passa a enxergar e editar{" "}
            <strong>todos os dados financeiros</strong> da família — não há dados privados por
            usuário nesta aplicação.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="nome">Nome</Label>
            <Input id="nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="senha">Senha</Label>
            <Input
              id="senha"
              type="password"
              required
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <DialogFooter>
            <Button type="submit" disabled={carregando}>
              {carregando ? "Criando..." : "Criar usuário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditarUsuarioConteudo({ usuario, onCancelar, onEditado }) {
  const [nome, setNome] = useState(usuario.nome);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    const resultado = await editarUsuario(usuario.id, {
      nome,
      senha: senha || undefined,
    });

    setCarregando(false);

    if (resultado?.error) {
      setErro(resultado.error);
      return;
    }

    onEditado();
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{usuario.email}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-nome">Nome</Label>
          <Input id="edit-nome" required value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-senha">Nova senha</Label>
          <Input
            id="edit-senha"
            type="password"
            minLength={6}
            placeholder="Deixe em branco para manter a senha atual"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </div>
        {erro && <p className="text-sm text-destructive">{erro}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={carregando}>
            {carregando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

function EditarUsuarioDialog({ usuario, onOpenChange, onEditado }) {
  return (
    <Dialog open={usuario !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuário</DialogTitle>
        </DialogHeader>
        {usuario && (
          <EditarUsuarioConteudo
            key={usuario.id}
            usuario={usuario}
            onCancelar={() => onOpenChange(false)}
            onEditado={onEditado}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UsuariosClient({ usuarios, usuarioAtualId }) {
  const router = useRouter();
  const [novoUsuarioAberto, setNovoUsuarioAberto] = useState(false);
  const [usuarioEditando, setUsuarioEditando] = useState(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button onClick={() => setNovoUsuarioAberto(true)}>
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Usuários da família</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-border">
            {usuarios.map((usuario) => (
              <div key={usuario.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="flex items-center gap-2 font-medium">
                    {usuario.nome}
                    {usuario.ehAdmin && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                        Administrador
                      </span>
                    )}
                    {usuario.id === usuarioAtualId && (
                      <span className="text-xs font-normal text-muted-foreground">(você)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{usuario.email}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setUsuarioEditando(usuario)}>
                  Editar
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <NovoUsuarioDialog
        aberto={novoUsuarioAberto}
        onOpenChange={setNovoUsuarioAberto}
        onCriado={() => router.refresh()}
      />

      <EditarUsuarioDialog
        usuario={usuarioEditando}
        onOpenChange={(open) => !open && setUsuarioEditando(null)}
        onEditado={() => {
          setUsuarioEditando(null);
          router.refresh();
        }}
      />
    </div>
  );
}
