import {
  Component,
  OnInit,
  OnDestroy,
  Inject,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { SessionStateService } from '@app/session/sessions/session-state.service';
import { Router } from '@angular/router';
import { CredentialsService, Logger } from '@app/core';
import { BodyClassComponent } from '@app/shared/body-class.component';
import { DOCUMENT } from '@angular/common';
import { Subscription } from 'rxjs';
import { UserInfo } from '@app/core/authentication/user.types';
import { environment } from '@env/environment.prod';
import { MediaService, MediaStreamType } from '@app/shared/services/media/media.service';
import { VideoLocation } from '@app/session/agora/utils/meeting-user-info';

const log = new Logger('VideoCheck');

@Component({
  selector: 'video-check',
  templateUrl: './video-check.component.html',
  styleUrls: ['./video-check.component.scss']
})
export class VideoCheckComponent extends BodyClassComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @ViewChild('videoContainer', { static: true }) videoContainer: ElementRef;
  @ViewChild('videoItem', { static: true }) videoItem: ElementRef;
  @ViewChild('camera', { static: true }) cameraElementRef!: ElementRef;

  public selectedVideoInId?: string;

  workingVideo = false;
  triedAgain = false;
  nickname = '';
  joinClassBtnText = 'Enter Classroom';
  userInfo: UserInfo;

  // Flag to know when the component as loaded
  loaded = false;

  // Related to help functionality
  askedForHelp = false;
  videoCheckHelp = environment.videoCheckHelp;

  private subscriptions: Subscription[] = [];
  private stream?: MediaStream;

  // private localStream: Stream;
  private onPermissionsReady$: Subscription;

  constructor(
    private mediaService: MediaService,
    private sessionStateService: SessionStateService,
    private router: Router,
    private credentialService: CredentialsService,
    @Inject(DOCUMENT) document: Document
  ) {
    super(document);
    this.bodyClass = 'video-check';

    if (!this.videoCheckHelp || this.videoCheckHelp.length !== 2) {
      this.videoCheckHelp = ['Help is on the way', 'Have your phone near you.'];
    }
  }

  async ngOnInit() {
    super.ngOnInit();
    this.onPermissionsReady$ = this.credentialService.onPermissionsReady$.subscribe((ready: boolean) => {
      this.userInfo = new UserInfo({
        nickname: this.credentialService.credentials.nickname,
        name: this.credentialService.credentials.name
      });
    });
  }

  async ngAfterViewInit() {
    const vsubscription = this.mediaService.selectedVideoInputId.subscribe(id => {
      this.selectedVideoInId = id;
      this.startCameraMic(this.selectedVideoInId);
    });
    this.subscriptions.push(vsubscription);

    setTimeout(() => {
      this.onResize();
    }, 0);
  }

  ngOnChanges(changes: SimpleChanges) {
    /* Note that the properties of the object are set to the current value when this is called.*/

    for (const propName in changes) {
      if (changes.hasOwnProperty(propName)) {
        const chng = changes[propName];

        if (propName === 'location' && !!chng.currentValue) {
          const location = chng.currentValue as VideoLocation;
          const videoItem = this.videoItem.nativeElement;
          const videoContainer = this.videoContainer.nativeElement;
          if (location && location.height > 0 && location.width > 0) {
            // Update absolute location
            if (videoContainer && videoItem) {
              videoItem.style.width = `${location.width}px`;
              videoItem.style.position = 'absolute';
              videoItem.style.left = `${location.left}px`;
              videoItem.style.top = `${location.top}px`;
              videoContainer.style.height = `${location.height}px`;
            }
          }
        }
      }
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    for (const sub of this.subscriptions) {
      sub.unsubscribe();
    }

    this.stopCamera();

    if (this.onPermissionsReady$) {
      this.onPermissionsReady$.unsubscribe();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event?: any) {
    const currentWidth = this.videoContainer.nativeElement.offsetWidth;
    const multiplier = currentWidth / 16;
    const height = Math.ceil(multiplier * 9);
    this.videoContainer.nativeElement.style.height = `${height}px`;
  }

  async startCameraMic(camDeviceId?: string) {
    const mediaStreamAudio = MediaStreamType.audio;
    await this.mediaService.getMediaStream(mediaStreamAudio, undefined, undefined, undefined);

    const mediaStreamVideo = MediaStreamType.video;
    this.stream = await this.mediaService.getMediaStream(mediaStreamVideo, undefined, undefined, camDeviceId);

    if (this.stream) {
      this.loaded = true;
      this.workingVideo = true;

      this.cameraElementRef.nativeElement.srcObject = this.stream;
      this.cameraElementRef.nativeElement.onloadedmetadata = () => {
        this.cameraElementRef.nativeElement.play();
      };
    } else {
      this.loaded = true;
      this.workingVideo = false;
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }

  async tryAgain() {
    this.stopCamera();
    await this.startCameraMic(this.selectedVideoInId);
    if (!this.workingVideo) {
      this.triedAgain = true;
      this.joinClassBtnText = 'Join Class Anyway';
    }
  }

  startOver() {
    this.stopCamera();
    this.triedAgain = false;
    this.joinClassBtnText = 'Join Class';
    window.location.reload();
  }

  continue() {
    const session = this.sessionStateService.getSession();
    if (this.workingVideo && session && session.acronym) {
      this.router.navigate([`/session/agora/group/${session.acronym}`]);
    }
  }

  askForHelp() {
    this.askedForHelp = !this.askedForHelp;
  }
}
