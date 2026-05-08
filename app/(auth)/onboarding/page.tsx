"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Brain,
  Target,
  BarChart3,
  Monitor,
  LineChart,
  Dice5,
  Wallet,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { getStoredUserId } from "@/lib/auth";

// ── Question definitions derived from mock-data answers ──

interface ScoredOption {
  score: number;
  label: string;
}

interface ScoredQuestion {
  type: "scored";
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  options: ScoredOption[];
}

interface TextQuestion {
  type: "text";
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  placeholder: string;
}

type Question = ScoredQuestion | TextQuestion;

const questions: Question[] = [
  {
    type: "scored",
    id: "self_learning",
    icon: Brain,
    title: "Khả năng tự học",
    subtitle: "Khi gặp một khái niệm mới mà bạn chưa hiểu rõ, bạn thường làm gì?",
    options: [
      { score: 1, label: "Xem lại một vài lần, nếu vẫn chưa rõ thì chuyển sang phần khác" },
      { score: 2, label: "Hỏi bạn bè hoặc tìm video khác giải thích đơn giản hơn" },
      { score: 3, label: "Tự tìm hiểu thêm rồi mới tiếp tục" },
      { score: 4, label: "Ghi lại và tìm cách hiểu rõ, rồi mới sang bài tiếp" },
    ],
  },
  {
    type: "scored",
    id: "motivation",
    icon: Target,
    title: "Động lực học Trading",
    subtitle: "Điều gì thúc đẩy bạn tìm đến ROVA?",
    options: [
      { score: 1, label: "Tò mò, muốn thử xem trading có kiếm tiền được không" },
      { score: 2, label: "Đang cần thu nhập nhanh, muốn học và áp dụng sớm" },
      { score: 3, label: "Đang gặp vấn đề trong giao dịch, muốn có phương pháp rõ ràng" },
      { score: 4, label: "Đã có ý định học bài bản, đi đường dài" },
    ],
  },
  {
    type: "scored",
    id: "tradingview_skill",
    icon: BarChart3,
    title: "Kỹ năng TradingView",
    subtitle: "Bạn đã sử dụng TradingView ở mức nào?",
    options: [
      { score: 1, label: "Chưa biết, chưa có tài khoản TradingView" },
      { score: 2, label: "Đã từng dùng, chủ yếu mở lên xem giá" },
      { score: 3, label: "Biết vẽ đường, đánh dấu vùng giá, thêm indicator" },
      { score: 4, label: "Có layout riêng và sử dụng thường xuyên để phân tích" },
    ],
  },
  {
    type: "scored",
    id: "device",
    icon: Monitor,
    title: "Thiết bị học tập",
    subtitle: "Bạn thường dùng thiết bị gì để học và giao dịch?",
    options: [
      { score: 1, label: "Chỉ dùng điện thoại, chưa có máy tính" },
      { score: 2, label: "Chủ yếu dùng điện thoại, có máy tính nhưng không thường xuyên" },
      { score: 3, label: "Chủ yếu dùng máy tính để học và giao dịch" },
      { score: 4, label: "Thành thạo máy tính và ứng dụng điện thoại" },
    ],
  },
  {
    type: "scored",
    id: "trading_method",
    icon: LineChart,
    title: "Phương pháp giao dịch",
    subtitle: "Hiện tại bạn giao dịch theo phương pháp nào?",
    options: [
      { score: 1, label: "Chưa có phương pháp, chủ yếu vào lệnh theo cảm tính" },
      { score: 2, label: "Đã thử qua nhiều phương pháp, chưa kiểm chứng rõ" },
      { score: 3, label: "Đang tập trung giao dịch theo một phương pháp" },
      { score: 4, label: "Đã có phương pháp riêng, đang tối ưu" },
    ],
  },
  {
    type: "scored",
    id: "probability_thinking",
    icon: Dice5,
    title: "Tư duy xác suất",
    subtitle: "Khi bạn thua lỗ liên tiếp 3 lệnh, bạn thường làm gì?",
    options: [
      { score: 1, label: "Xem lại thị trường và điều chỉnh cách vào lệnh" },
      { score: 2, label: "Tạm dừng một thời gian để quan sát" },
      { score: 3, label: "Xem lại các lệnh đã vào để hiểu điều gì chưa ổn" },
      { score: 4, label: "Tiếp tục giao dịch như bình thường và theo dõi" },
    ],
  },
  {
    type: "text",
    id: "income_status",
    icon: Wallet,
    title: "Tình trạng thu nhập",
    subtitle: "Mô tả ngắn gọn tình trạng tài chính hiện tại của bạn",
    placeholder: "Ví dụ: Có thu nhập ổn định hàng tháng, trading là thêm",
  },
  {
    type: "text",
    id: "device_detail",
    icon: Smartphone,
    title: "Chi tiết thiết bị",
    subtitle: "Bạn đang dùng thiết bị gì cụ thể?",
    placeholder: "Ví dụ: MacBook Pro, iPhone 15, setup 2 màn hình...",
  },
];

function classifyScore(totalScore: number, hasAnyOne: boolean): string {
  if (hasAnyOne || totalScore <= 10) return "newbie";
  if (totalScore <= 14) return "beginner";
  if (totalScore <= 19) return "intermediate";
  return "advanced";
}

const classificationInfo: Record<string, { label: string; color: string; description: string }> = {
  newbie: {
    label: "Newbie",
    color: "text-gray-700 dark:text-gray-300",
    description: "Bạn mới bắt đầu hành trình Trading. ROVA sẽ hướng dẫn bạn từng bước từ cơ bản nhất!",
  },
  beginner: {
    label: "Beginner",
    color: "text-blue-700 dark:text-blue-300",
    description: "Bạn đã có nền tảng ban đầu. Hãy cùng ROVA xây dựng phương pháp giao dịch vững chắc!",
  },
  intermediate: {
    label: "Intermediate",
    color: "text-amber-700 dark:text-amber-300",
    description: "Bạn có kiến thức khá tốt. ROVA sẽ giúp bạn tối ưu chiến lược và quản lý rủi ro!",
  },
  advanced: {
    label: "Advanced",
    color: "text-green-700 dark:text-green-300",
    description: "Bạn là trader có kinh nghiệm. ROVA sẽ đồng hành nâng cấp hệ thống giao dịch của bạn!",
  },
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string>>({});
  const [showResult, setShowResult] = useState(false);

  const totalSteps = questions.length;
  const currentQuestion = questions[step];
  const progress = ((step + (showResult ? 1 : 0)) / totalSteps) * 100;

  const currentAnswer = answers[currentQuestion?.id];
  const canNext =
    currentQuestion?.type === "scored"
      ? typeof currentAnswer === "number"
      : typeof currentAnswer === "string" && (currentAnswer as string).trim().length > 0;

  const handleSelect = (value: number | string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const handleBack = () => {
    if (showResult) {
      setShowResult(false);
    } else if (step > 0) {
      setStep(step - 1);
    }
  };

  // Calculate results
  const scoredQuestions = questions.filter((q) => q.type === "scored");
  const totalScore = scoredQuestions.reduce(
    (sum, q) => sum + (typeof answers[q.id] === "number" ? (answers[q.id] as number) : 0),
    0
  );
  const hasAnyOne = scoredQuestions.some((q) => answers[q.id] === 1);
  const classification = classifyScore(totalScore, hasAnyOne);
  const result = classificationInfo[classification];

  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    try {
      const userId = getStoredUserId();
      if (userId) {
        await supabase
          .from("profiles")
          .update({ classification })
          .eq("id", userId);
      }
    } catch (err) {
      console.error("Failed to save classification:", err);
    }
    router.push("/student");
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">
            {showResult ? "Kết quả" : `Câu ${step + 1} / ${totalSteps}`}
          </span>
          <span className="text-sm text-gold font-medium">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gold/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gold"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!showResult ? (
          <motion.div
            key={`step-${step}`}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-gold-shadow/30 bg-card p-8 md:p-10"
          >
            {/* Question */}
            <h2 className="text-xl md:text-2xl font-bold text-foreground leading-snug mb-10">
              {currentQuestion.subtitle}
            </h2>

            {/* Options or Text Input */}
            {currentQuestion.type === "scored" ? (
              <div className="space-y-4">
                {currentQuestion.options.map((option) => {
                  const isSelected = answers[currentQuestion.id] === option.score;
                  return (
                    <motion.button
                      key={option.score}
                      onClick={() => handleSelect(option.score)}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full text-left px-5 py-4 rounded-xl border transition-all duration-200",
                        isSelected
                          ? "border-gold/50 bg-gold/10 gold-border-glow"
                          : "border-gold-shadow/30 bg-background hover:border-gold/20 hover:bg-gold/5"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors",
                            isSelected
                              ? "border-gold bg-gold"
                              : "border-muted-foreground/30"
                          )}
                        >
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-2 h-2 rounded-full bg-gold-black"
                            />
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-[15px] leading-relaxed",
                            isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                          )}
                        >
                          {option.label}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <Input
                placeholder={currentQuestion.placeholder}
                value={(answers[currentQuestion.id] as string) || ""}
                onChange={(e) => handleSelect(e.target.value)}
                className="bg-background border-gold-shadow/30 focus:border-gold/50 py-6 text-base"
              />
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-10 pt-6 border-t border-gold-shadow/20">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={step === 0}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={16} className="mr-2" />
                Quay lại
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canNext}
                className="bg-gold hover:bg-gold-medium text-gold-black font-semibold px-8 py-5"
              >
                {step === totalSteps - 1 ? "Xem kết quả" : "Tiếp theo"}
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </motion.div>
        ) : (
          /* ── Result Screen ── */
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-gold-shadow/30 bg-card p-6 md:p-8 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-gold/10 border-2 border-gold/30 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 size={36} className="text-gold" />
            </motion.div>

            <h2 className="text-2xl font-bold text-foreground mb-2">
              Hoàn thành khảo sát!
            </h2>
            <p className="text-muted-foreground mb-8">
              Dựa trên câu trả lời của bạn, đây là kết quả phân loại:
            </p>

            {/* Score display */}
            <div className="inline-flex items-center gap-6 rounded-2xl border border-gold/20 bg-gold/5 px-8 py-5 mb-6">
              <div className="text-center">
                <div className="text-4xl font-extrabold text-gold">{totalScore}</div>
                <div className="text-xs text-muted-foreground mt-1">Tổng điểm</div>
              </div>
              <div className="w-px h-12 bg-gold/20" />
              <div className="text-center">
                <div className={cn("text-2xl font-bold", result.color)}>
                  {result.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Phân loại</div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
              {result.description}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft size={16} className="mr-2" />
                Xem lại câu trả lời
              </Button>
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="bg-gold hover:bg-gold-medium text-gold-black font-bold px-8 py-5 rounded-xl"
              >
                {saving ? "Đang lưu..." : "Bắt đầu học ngay"}
                {!saving && <ArrowRight size={16} className="ml-2" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
