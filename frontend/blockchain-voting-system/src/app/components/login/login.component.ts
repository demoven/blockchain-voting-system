import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isRegisterMode = false;
  errorMessage = '';

  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private authService: AuthService,
    private router: Router,
    private fb: FormBuilder
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  toggleMode() {
    this.isRegisterMode = !this.isRegisterMode;
    this.errorMessage = '';
    this.loginForm.reset();
    this.registerForm.reset();
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;
    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Login failed';
      }
    });
  }

  onRegister() {
    if (this.registerForm.invalid) return;

    const { email, password } = this.registerForm.value;
    this.authService.register(email, password).subscribe({
      next: () => {
        this.isRegisterMode = false;
        this.errorMessage = 'Registration successful! Please login.';
        this.registerForm.reset();
      },
      error: (err) => {
        this.errorMessage = err.error.error || 'Registration failed';
      }
    });
  }
}
