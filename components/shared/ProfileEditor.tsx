"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Shield,
  Users,
  Calendar,
  Camera,
  Pencil,
  Check,
  X,
  MessageSquare,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn, formatDate } from "@/lib/utils";
import type { Profile } from "@/lib/auth";
import { PageTransition } from "@/components/shared/PageTransition";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const classificationLabels: Record<string, string> = {
  newbie: "Newbie",
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const classificationColors: Record<string, string> = {
  newbie: "bg-gray-500/15 text-gray-700 dark:text-gray-300",
  beginner: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  intermediate: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  advanced: "bg-green-500/15 text-green-700 dark:text-green-300",
};

const roleLabels: Record<string, string> = {
  student: "Học viên",
  mentor: "Mentor",
  admin: "Admin",
};

interface ProfileEditorProps {
  user: Profile;
  mentorName?: string | null;
}

export function ProfileEditor({ user, mentorName }: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    full_name: user.full_name,
    phone: user.phone || "",
    discord_handle: user.discord_handle || "",
  });
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initials = user.full_name
    .split(" ")
    .map((w) => w[0])
    .slice(-2)
    .join("")
    .toUpperCase();

  function resizeImage(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let w = img.width;
          let h = img.height;
          if (w > maxSize || h > maxSize) {
            if (w > h) { h = (h / w) * maxSize; w = maxSize; }
            else { w = (w / h) * maxSize; h = maxSize; }
          }
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const dataUrl = await resizeImage(file, 200);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: dataUrl })
        .eq("id", user.id);

      if (!error) {
        setAvatarUrl(dataUrl);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("rova:profile-updated"));
        }
      }
    } catch (err) {
      console.error("Failed to upload avatar:", err);
    }
    setUploadingAvatar(false);
  }

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        phone: form.phone.trim() || null,
        discord_handle: form.discord_handle.trim() || null,
      })
      .eq("id", user.id);

    setSaving(false);
    setSaved(true);
    setEditing(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("rova:profile-updated"));
    }
    setTimeout(() => setSaved(false), 3000);
  }

  function handleCancel() {
    setForm({
      full_name: user.full_name,
      phone: user.phone || "",
      discord_handle: user.discord_handle || "",
    });
    setEditing(false);
  }

  return (
    <PageTransition>
      <div className="space-y-6 p-6 max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold gold-gradient-text">Hồ sơ cá nhân</h1>
          <p className="text-muted-foreground mt-1">
            Quản lý thông tin tài khoản của bạn.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="space-y-6">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar className="h-20 w-20 border-2 border-gold/30">
                    {avatarUrl && <AvatarImage src={avatarUrl} />}
                    <AvatarFallback className="bg-gold/10 text-gold text-xl font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  {uploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  {editing ? (
                    <Input
                      value={form.full_name}
                      onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                      className="text-lg font-bold"
                      placeholder="Họ tên"
                    />
                  ) : (
                    <h2 className="text-xl font-bold text-foreground">{form.full_name}</h2>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-gold/15 text-gold text-xs">
                      {roleLabels[user.role] || user.role}
                    </Badge>
                    {user.classification && (
                      <Badge className={cn("text-xs", classificationColors[user.classification])}>
                        {classificationLabels[user.classification]}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Info rows */}
              <div className="space-y-4">
                {/* Email — không chỉnh sửa */}
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                    <Mail className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground mt-0.5">{user.email}</p>
                  </div>
                </div>

                {/* SĐT */}
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                    <Phone className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Số điện thoại</p>
                    {editing ? (
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="Nhập số điện thoại"
                        className="mt-1 h-9"
                      />
                    ) : (
                      <p className="text-sm text-foreground mt-0.5">
                        {form.phone || <span className="text-muted-foreground italic">Chưa cập nhật</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Discord */}
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                    <MessageSquare className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Discord</p>
                    {editing ? (
                      <Input
                        value={form.discord_handle}
                        onChange={(e) => setForm({ ...form, discord_handle: e.target.value })}
                        placeholder="username#1234"
                        className="mt-1 h-9"
                      />
                    ) : (
                      <p className="text-sm text-foreground mt-0.5">
                        {form.discord_handle || <span className="text-muted-foreground italic">Chưa cập nhật</span>}
                      </p>
                    )}
                  </div>
                </div>

                {/* Mentor (student only) */}
                {user.role === "student" && (
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                      <Users className="h-4 w-4 text-gold" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Mentor</p>
                      <p className="text-sm text-foreground mt-0.5">
                        {mentorName || <span className="text-muted-foreground italic">Chưa được gán</span>}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ngày tham gia */}
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/10">
                    <Calendar className="h-4 w-4 text-gold" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Ngày tham gia</p>
                    <p className="text-sm text-foreground mt-0.5">{formatDate(user.created_at)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center gap-3">
                {editing ? (
                  <>
                    <Button
                      onClick={handleSave}
                      disabled={saving || !form.full_name.trim()}
                      className="bg-gold hover:bg-gold/90 text-black font-semibold"
                    >
                      <Check className="h-4 w-4 mr-1.5" />
                      {saving ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                    <Button variant="outline" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-1.5" />
                      Huỷ
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    className="border-gold/50 text-gold hover:bg-gold/10"
                    onClick={() => setEditing(true)}
                  >
                    <Pencil className="h-4 w-4 mr-1.5" />
                    Chỉnh sửa hồ sơ
                  </Button>
                )}
                {saved && (
                  <motion.span
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm text-emerald-500 flex items-center gap-1"
                  >
                    <Check className="h-4 w-4" /> Đã lưu!
                  </motion.span>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}
