from django.conf import settings
from django.db import models
from django.utils import timezone


class UserProfile(models.Model):
    ROLE_CHOICES = [
        ("learner", "Learner"),
        ("premium", "Premium learner"),
        ("mentor", "Mentor"),
        ("content_manager", "Content manager"),
        ("admin", "Admin"),
    ]
    PREMIUM_STATUS_CHOICES = [
        ("free", "Free"),
        ("trial", "Trial"),
        ("active", "Active"),
        ("expired", "Expired"),
    ]
    LANGUAGE_CHOICES = [
        ("ru", "Russian"),
        ("de", "German"),
        ("en", "English"),
    ]
    LEVEL_CHOICES = [
        ("start", "Start"),
        ("a1", "A1"),
        ("a2", "A2"),
        ("b1", "B1"),
    ]

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="learning_profile")
    role = models.CharField(max_length=32, choices=ROLE_CHOICES, default="learner")
    premium_status = models.CharField(max_length=16, choices=PREMIUM_STATUS_CHOICES, default="free")
    interface_language = models.CharField(max_length=8, choices=LANGUAGE_CHOICES, default="ru")
    explanation_language = models.CharField(max_length=8, choices=LANGUAGE_CHOICES, default="ru")
    email_verified = models.BooleanField(default=False)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default="start")
    main_goal = models.CharField(max_length=160, blank=True)
    preferred_topic = models.CharField(max_length=64, blank=True)
    save_progress = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        permissions = [
            ("manage_premium_status", "Can manage premium status"),
        ]

    def __str__(self):
        return f"Profile: {self.user.username}"

    @property
    def has_premium_access(self):
        if self.premium_status in ["trial", "active"] or self.role == "premium":
            return True
        return self.user.subscriptions.filter(
            plan__is_premium=True, status__in=["trialing", "active"],
        ).filter(models.Q(current_period_end__isnull=True) | models.Q(current_period_end__gte=timezone.now())).exists()


class Plan(models.Model):
    INTERVAL_CHOICES = [
        ("month", "Monthly"),
        ("year", "Yearly"),
    ]

    code = models.SlugField(unique=True)
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    price_cents = models.PositiveIntegerField(default=0)
    currency = models.CharField(max_length=3, default="EUR")
    interval = models.CharField(max_length=12, choices=INTERVAL_CHOICES, default="month")
    is_premium = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    stripe_price_id = models.CharField(max_length=120, blank=True)
    paypal_plan_id = models.CharField(max_length=120, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["price_cents", "code"]

    def __str__(self):
        return self.name


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("trialing", "Trialing"),
        ("active", "Active"),
        ("past_due", "Past due"),
        ("canceled", "Canceled"),
        ("expired", "Expired"),
    ]
    PROVIDER_CHOICES = [
        ("manual", "Manual"),
        ("stripe", "Stripe"),
        ("paypal", "PayPal"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="subscriptions")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="active")
    provider = models.CharField(max_length=24, choices=PROVIDER_CHOICES, default="manual")
    provider_subscription_id = models.CharField(max_length=160, blank=True)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["provider", "provider_subscription_id"]),
        ]

    @property
    def grants_premium_access(self):
        if not self.plan.is_premium or self.status not in ["trialing", "active"]:
            return False
        return self.current_period_end is None or self.current_period_end >= timezone.now()

    def __str__(self):
        return f"{self.user.username}: {self.plan.code} ({self.status})"


class WebhookEvent(models.Model):
    PROVIDER_CHOICES = [
        ("stripe", "Stripe"),
        ("paypal", "PayPal"),
    ]
    STATUS_CHOICES = [
        ("received", "Received"),
        ("processed", "Processed"),
        ("failed", "Failed"),
    ]

    provider = models.CharField(max_length=24, choices=PROVIDER_CHOICES)
    event_id = models.CharField(max_length=180, blank=True)
    event_type = models.CharField(max_length=160)
    payload = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="received")
    received_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-received_at"]
        unique_together = ["provider", "event_id"]
        indexes = [models.Index(fields=["provider", "status"])]

    def __str__(self):
        return f"{self.provider}: {self.event_type}"


class Category(models.Model):
    slug = models.SlugField(unique=True)
    title_de = models.CharField(max_length=120)
    title_ru = models.CharField(max_length=120)
    icon = models.CharField(max_length=16, blank=True)
    description_de = models.TextField(blank=True)
    description_ru = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "title_de"]
        verbose_name_plural = "Categories"

    def __str__(self):
        return self.title_de


class Scene(models.Model):
    LEVEL_CHOICES = UserProfile.LEVEL_CHOICES

    category = models.ForeignKey(Category, on_delete=models.SET_NULL, related_name="scenes", null=True, blank=True)
    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=160)
    topic_id = models.CharField(max_length=64)
    icon = models.CharField(max_length=16, blank=True)
    description_de = models.TextField(blank=True)
    description_ru = models.TextField(blank=True)
    level = models.CharField(max_length=16, choices=LEVEL_CHOICES, default="a1")
    is_premium = models.BooleanField(default=False)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["topic_id", "title"]
        indexes = [
            models.Index(fields=["topic_id", "is_published"]),
            models.Index(fields=["level", "is_premium"]),
        ]

    def __str__(self):
        return self.title


class SceneLine(models.Model):
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="lines")
    speaker = models.CharField(max_length=120)
    text_de = models.TextField()
    text_ru = models.TextField()
    pronunciation = models.CharField(max_length=220, blank=True)
    explanation = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "Dialogue line"
        verbose_name_plural = "Dialogue lines"

    def __str__(self):
        return f"{self.scene.title}: {self.speaker}"


class Vocabulary(models.Model):
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="vocabulary", null=True, blank=True)
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="vocabulary", null=True, blank=True)
    word_de = models.CharField(max_length=160)
    translation_ru = models.CharField(max_length=220)
    example_de = models.TextField(blank=True)
    example_ru = models.TextField(blank=True)
    note_ru = models.TextField(blank=True)
    order = models.PositiveSmallIntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "word_de"]
        unique_together = ["category", "word_de"]

    def __str__(self):
        return self.word_de


class QuizQuestion(models.Model):
    QUESTION_TYPES = [
        ("choice", "Multiple Choice"),
        ("text", "Free Text"),
    ]

    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="quiz_questions", null=True, blank=True)
    topic_id = models.CharField(max_length=64)
    question_type = models.CharField(max_length=16, choices=QUESTION_TYPES, default="choice")
    prompt_de = models.TextField(blank=True)
    prompt_ru = models.TextField()
    options = models.JSONField(default=list, blank=True)
    correct_answer = models.TextField()
    explanation_ru = models.TextField(blank=True)
    points = models.PositiveSmallIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["topic_id", "id"]

    def __str__(self):
        return self.prompt_ru[:80]


class QuizAnswer(models.Model):
    question = models.ForeignKey(QuizQuestion, on_delete=models.CASCADE, related_name="answers")
    text = models.CharField(max_length=240)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.text


class QuizAttempt(models.Model):
    DIFFICULTY_CHOICES = [
        ("easy", "Easy"),
        ("medium", "Medium"),
        ("hard", "Hard"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="quiz_attempts")
    topic_id = models.CharField(max_length=64)
    topic_label = models.CharField(max_length=120)
    score = models.PositiveSmallIntegerField()
    total = models.PositiveSmallIntegerField()
    duration_seconds = models.PositiveIntegerField(default=0)
    difficulty = models.CharField(max_length=16, choices=DIFFICULTY_CHOICES, default="easy")
    # Older results remain valid; new issued quizzes use one durable submission key.
    quiz_token_hash = models.CharField(max_length=64, null=True, blank=True, unique=True, editable=False)
    submission_hash = models.CharField(max_length=64, blank=True, default="", editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        permissions = [
            ("view_all_quiz_results", "Can view all quiz results"),
        ]

    @property
    def percentage(self):
        if self.total == 0:
            return 0
        return round((self.score / self.total) * 100)

    def __str__(self):
        return f"{self.user.username}: {self.topic_label} {self.score}/{self.total}"


class QuizResult(QuizAttempt):
    class Meta:
        proxy = True
        verbose_name = "Quiz result"
        verbose_name_plural = "Quiz results"


class UserProgress(models.Model):
    STATUS_CHOICES = [
        ("started", "Started"),
        ("completed", "Completed"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="scene_progress")
    scene = models.ForeignKey(Scene, on_delete=models.CASCADE, related_name="progress_entries", null=True, blank=True)
    scene_key = models.CharField(max_length=160)
    topic_id = models.CharField(max_length=64)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="started")
    completed_exercises = models.PositiveSmallIntegerField(default=0)
    last_activity_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ["user", "topic_id", "scene_key"]

    def __str__(self):
        return f"{self.user.username}: {self.topic_id} {self.status}"


class UserVocabulary(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="vocabulary")
    word_de = models.CharField(max_length=160)
    translation_ru = models.CharField(max_length=220)
    source_topic_id = models.CharField(max_length=64, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["word_de"]
        unique_together = ["user", "word_de"]

    def __str__(self):
        return f"{self.user.username}: {self.word_de}"


class WritingExercise(models.Model):
    STATUS_CHOICES = [
        ("draft", "Draft"),
        ("corrected", "Corrected"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="writing_exercises")
    topic_id = models.CharField(max_length=64, default="baeckerei")
    topic_label = models.CharField(max_length=120, default="Bäckerei")
    prompt = models.TextField()
    user_text = models.TextField()
    correction = models.TextField(blank=True)
    explanation = models.TextField(blank=True)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default="corrected")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["topic_id", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user.username}: {self.topic_label}"


class BotExchange(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bot_exchanges")
    question = models.TextField()
    answer = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Bot exchange for {self.user.username}"


class ChatHistory(models.Model):
    MODE_CHOICES = [
        ("writing", "Writing training"),
        ("quiz", "Quiz free answer"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_history")
    mode = models.CharField(max_length=24, choices=MODE_CHOICES, default="writing")
    user_message = models.TextField()
    bot_response = models.TextField()
    correction = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username}: {self.mode}"


class Feedback(models.Model):
    CATEGORY_CHOICES = [
        ("bug", "Bug report"),
        ("suggestion", "Suggestion"),
        ("content", "Content issue"),
        ("account", "Account"),
        ("other", "Other"),
    ]
    STATUS_CHOICES = [
        ("new", "New"),
        ("in_review", "In review"),
        ("resolved", "Resolved"),
        ("spam", "Spam"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, related_name="feedback_items", null=True, blank=True)
    category = models.CharField(max_length=24, choices=CATEGORY_CHOICES, default="suggestion")
    message = models.TextField()
    status = models.CharField(max_length=24, choices=STATUS_CHOICES, default="new")
    page_path = models.CharField(max_length=220, blank=True)
    contact_email = models.EmailField(blank=True)
    user_agent = models.CharField(max_length=260, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["category", "created_at"]),
        ]

    def __str__(self):
        return f"{self.get_category_display()}: {self.message[:60]}"


class Achievement(models.Model):
    code = models.SlugField(unique=True)
    title = models.CharField(max_length=120)
    description = models.TextField()
    users = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name="achievements", blank=True)

    def __str__(self):
        return self.title
