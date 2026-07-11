import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: '<router-outlet />',
})
export class App implements OnInit {
  private auth = inject(AuthService);
  // Instantiate ThemeService so the saved theme is applied on boot.
  private theme = inject(ThemeService);

  ngOnInit(): void {
    this.auth.loadMe();
  }
}
