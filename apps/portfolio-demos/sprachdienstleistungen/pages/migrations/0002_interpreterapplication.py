from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

  dependencies = [
    ('auth', '0012_alter_user_first_name_max_length'),
    ('pages', '0001_initial'),
  ]

  operations = [
    migrations.CreateModel(
      name='InterpreterApplication',
      fields=[
        ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
        ('languages', models.CharField(max_length=200)),
        ('region', models.CharField(blank=True, max_length=200)),
        ('experience', models.CharField(blank=True, max_length=200)),
        ('availability', models.CharField(blank=True, max_length=200)),
        ('motivation', models.TextField()),
        ('status', models.CharField(default='new', max_length=32)),
        ('created_at', models.DateTimeField(auto_now_add=True)),
        ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='interpreter_applications', to='auth.user')),
      ],
    ),
  ]
