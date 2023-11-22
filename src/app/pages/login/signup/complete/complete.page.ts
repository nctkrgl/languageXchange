import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { Store, select } from '@ngrx/store';
import { Observable, Subscription } from 'rxjs';
import { birthdateData } from 'src/app/extras/localeData'; // TODO: Delete it

import { getAge, nameParts } from 'src/app/extras/utils';
import { CompleteRegistrationRequestInterface } from 'src/app/models/types/requests/completeRegistrationRequest.interface';
import { completeRegistrationAction } from 'src/app/store/actions/auth.action';
import { Account } from 'src/app/models/Account';
import { Countries } from 'src/app/models/locale/Countries';
import { ErrorInterface } from 'src/app/models/types/errors/error.interface';
import { countriesSelector } from 'src/app/store/selectors/locale.selector';
import {
  accountSelector,
  isLoadingSelector,
  registerValidationErrorSelector,
} from 'src/app/store/selectors/auth.selector';
import { Country } from 'src/app/models/locale/Country';

@Component({
  selector: 'app-complete',
  templateUrl: './complete.page.html',
  styleUrls: ['./complete.page.scss'],
})
export class CompletePage implements OnInit, OnDestroy {
  private subscriptions = new Subscription();

  public progress: number = 0.7;
  searchTerm: string;

  form: FormGroup;
  account$: Observable<Account | null>;
  isLoading$: Observable<boolean>;
  countries$: Observable<Countries>;
  countyData: Country[];

  constructor(
    private store: Store,
    private router: Router,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.initForm();
    this.initValues();
  }

  ionViewWillLeave() {
    this.form.reset();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  initValues(): void {
    this.account$ = this.store.pipe(select(accountSelector));
    this.isLoading$ = this.store.pipe(select(isLoadingSelector));

    // Countries values
    this.countries$ = this.store.pipe(select(countriesSelector));
    this.subscriptions.add(
      this.countries$.subscribe((countries: Countries) => {
        this.countyData = countries?.countries;
      })
    );

    // Disable Form if loading
    this.subscriptions.add(
      this.isLoading$.subscribe((isLoading: boolean) => {
        if (isLoading) {
          this.form.disable();
        } else {
          this.form.enable();
        }
      })
    );

    // Present Toast if error
    this.store
      .pipe(select(registerValidationErrorSelector))
      .subscribe((error: ErrorInterface) => {
        if (error) this.presentToast(error.message, 'danger');
      });
  }

  initForm() {
    this.form = new FormGroup({
      birthdate: new FormControl('', { validators: [Validators.required] }),
      birthdateWithDateFormat: new FormControl('', {
        validators: [Validators.required],
      }),
      gender: new FormControl('', { validators: [Validators.required] }),
      country: new FormControl('', { validators: [Validators.required] }),
      countryCode: new FormControl('', { validators: [Validators.required] }),
    });
  }

  public birthdatePickerColumns = [
    {
      name: 'day',
      options: birthdateData.day,
    },
    {
      name: 'month',
      options: birthdateData.month,
    },
    {
      name: 'year',
      options: birthdateData.year,
    },
  ];

  public birthdatePickerButtons = [
    { text: 'Cancel', role: 'cancel' },
    {
      text: 'Confirm',
      handler: (value) => {
        let val =
          value.day.text + '/' + value.month.value + '/' + value.year.text;
        let newDate = new Date(val);
        if (getAge(newDate) < 13) {
          this.presentToast(
            'You must be at least 13 years old to use this app',
            'danger'
          );
        } else {
          this.form.controls['birthdate'].setValue(val);
          this.form.controls['birthdateWithDateFormat'].setValue(newDate);
        }
      },
    },
  ];

  genderChange(event) {
    this.form.controls['gender'].setValue(event.detail.value);
  }

  countryChange(event) {
    this.form.controls['countryCode'].setValue(event.detail.value);
    const country = this.countyData?.find(
      (country) => country.code === event.detail.value
    );
    this.form.controls['country'].setValue(country?.name);
  }

  async onSubmit() {
    console.log('form.value:', this.form.value);
    if (!this.form.valid) {
      this.presentToast('Please fill all the required fields', 'danger');
      return;
    }
    this.complete(this.form);
  }

  complete(form: FormGroup) {
    this.account$
      .subscribe((account: Account | null) => {
        // TODO: If guard works fine for the complete page, this should not be needed
        if (!account) {
          this.router.navigate(['/login']);
          this.presentToast('Please login or register again', 'danger');
          return;
        }
        const request: CompleteRegistrationRequestInterface = {
          name: nameParts(account?.name),
          birthdate: form.value.birthdateWithDateFormat,
          country: form.value.country,
          countryCode: form.value.countryCode,
          gender: form.value.gender,
          lastSeen: new Date(),
        };
        this.store.dispatch(
          completeRegistrationAction({ request, id: account.$id })
        );
      })
      .unsubscribe();
  }

  //
  // Present Toast
  //

  async presentToast(msg: string, color?: string) {
    const toast = await this.toastController.create({
      message: msg,
      color: color || 'primary',
      duration: 1500,
      position: 'bottom',
    });

    await toast.present();
  }
}
